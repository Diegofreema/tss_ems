import { ignoredNote } from '@/api/attendance/ignored'
import { registerService } from '@/api/attendance/service'
import type { SavedRegister, TakeRegisterBody } from '@/api/attendance/types'
import { SET, WRITE } from '../ids'
import { registerHandler } from '../registry'

/**
 * Filing a day's marks.
 *
 * Idempotent, and that is what makes it the right first write to queue: the
 * endpoint is an upsert keyed on the arm, the day and the student, so sending
 * the same marks twice files the same marks. An op that was in flight when the
 * tab died is simply sent again, with no temp ids and nothing to ask anybody.
 *
 * A student left out of `marks` is left alone rather than marked absent, so a
 * queue that sends a half-taken register files half a register — never an
 * afternoon of absences nobody meant.
 */
registerHandler<TakeRegisterBody>(WRITE.takeRegister, {
  send: (body) => registerService.take(body),
  idempotent: true,
  collectionId: SET.registerDays,
  // A student id the school did not recognise as being in this class was
  // filed against nothing. The teacher would otherwise count the marks and
  // find one short.
  note: (answer) => ignoredNote(answer as SavedRegister) || undefined,
})
