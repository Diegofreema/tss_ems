import type { MarkInput, RegisterStudent } from '../../../../api/attendance/types.ts'
import type { TakeRegisterBody } from '../../../../api/attendance/types.ts'
import type { TeacherStudent } from '../../../../api/teaching/types.ts'
import type { DayRegister } from '../../../../db/register-day.ts'
import { WRITE } from '../../../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../../../db/outbox.ts'

/**
 * A day's register put together on the device.
 *
 * Three things go into it, in this order: the roll, so there is a sheet to
 * mark at all; whatever the school has already filed for that day, where this
 * device has it; and the marks this teacher has made that the school has not
 * heard yet. The last of those is why a teacher can mark thirty children in a
 * classroom with no signal, walk out, close the browser, and find their
 * afternoon still on the screen.
 */

/** A mark as the sheet reads it, whether it is a bare word or carries a note. */
function readMark(mark: MarkInput): { status: string; notes: string } {
  return typeof mark === 'string'
    ? { status: mark, notes: '' }
    : { status: mark.status, notes: mark.notes ?? '' }
}

/**
 * The marks this device is still holding for one arm on one day.
 *
 * Only ops that are still expected to land. A `failed` one is not going to,
 * and drawing it as a mark would tell the teacher a child was marked when the
 * school refused it — that op belongs to the pending-work drawer, which is
 * where a person can retry or discard it. `needs-review` and `conflict` wait
 * there too: a needs-review register may already have landed, and drawing it
 * would claim marks a person has yet to vouch for.
 *
 * Later ops win, in `seq` order: marking a child present and then correcting
 * them to late leaves them late, which is the order the teacher did it in.
 */
export function queuedMarks(
  ops: readonly OutboxOp[],
  armId: number,
  date: string,
): Record<string, MarkInput> {
  const marks: Record<string, MarkInput> = {}

  const mine = ops
    .filter((op) => op.handler === WRITE.takeRegister && DRAWN_STATES.includes(op.state))
    .filter((op) => {
      const body = op.payload as TakeRegisterBody | undefined
      return (
        Number(body?.class_arm_id) === Number(armId) &&
        String(body?.date) === String(date)
      )
    })
    .sort((one, two) => one.seq - two.seq)

  for (const op of mine) {
    const body = op.payload as TakeRegisterBody
    for (const [studentId, mark] of Object.entries(body.marks ?? {})) {
      marks[studentId] = mark
    }
  }

  return marks
}

/** The roll of one arm, as a register sheet reads a student. */
export function rollFor(students: readonly TeacherStudent[], armId: number): RegisterStudent[] {
  return students
    .filter((student) => Number(student.class_arm_id) === Number(armId))
    .map((student) => ({
      student_id: student.id,
      name:
        [student.fname, student.mname, student.lname]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' ') || `Student ${student.id}`,
      regno: student.regno ?? null,
      status: null,
      notes: null,
    }))
    .sort((one, two) => one.name.localeCompare(two.name))
}

export type ComposedDay = {
  pupils: RegisterStudent[]
  /**
   * Students whose mark is written down here and not yet with the school.
   *
   * Named for what it is rather than "pending", which everywhere else in this
   * app means a request in flight — these are the opposite, marks that are not
   * in flight and are safe on the device until they can be.
   */
  waiting: Set<number>
  /**
   * Whether the school's own marks for this day are on this device.
   *
   * False means the sheet is being drawn from the roll alone, so a child may
   * already be marked in a way nothing here can see. The page says so rather
   * than letting a blank sheet read as an unmarked day — the endpoint leaves a
   * student out of `marks` alone, so marking from a blank sheet cannot erase
   * anybody, but a teacher is owed the difference between "nobody marked this"
   * and "this device does not know".
   */
  known: boolean
  /** Whether anybody has marked this day, as far as this device can tell. */
  taken: boolean
}

/**
 * The sheet for one arm on one day.
 *
 * The roll is the fallback rather than the primary, because the school's own
 * answer carries students this device's roll may not — a child placed in the
 * arm since the last sync — and carries the marks already filed.
 */
export function composeDay(
  held: DayRegister | undefined,
  roll: readonly TeacherStudent[],
  armId: number,
  queued: Record<string, MarkInput>,
): ComposedDay {
  const base = held?.pupils?.length ? held.pupils : rollFor(roll, armId)
  const waiting = new Set<number>()

  const pupils = base.map((student) => {
    const mark = queued[String(student.student_id)]
    if (mark === undefined) return student
    waiting.add(student.student_id)
    const { status, notes } = readMark(mark)
    return { ...student, status, notes: notes || student.notes }
  })

  return {
    pupils,
    waiting,
    known: held !== undefined,
    taken: Boolean(held?.taken) || waiting.size > 0,
  }
}
