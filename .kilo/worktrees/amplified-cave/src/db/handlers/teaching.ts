import { teachingService } from '@/api/teaching/service'
import type {
  CreateTopicBody,
  EnterScoreBody,
  MessageAdminBody,
  MessageStudentsBody,
  UpdateMyTeachingProfileBody,
  UpdateTopicBody,
} from '@/api/teaching/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder, noNewId } from '../new-id'
import { registerHandler } from '../registry'

/**
 * One mark on one sheet.
 *
 * Idempotent: the endpoint keys on the student, the subject, the session and
 * the term, so it creates the mark or moves it to what was sent. A sheet of
 * thirty is thirty ops rather than one, which is better than the loop it
 * replaces — that one stopped at the first refusal and stranded every row
 * after it. As ordered ops, a mark the school argues with fails on its own and
 * the twenty-nine behind it still land.
 */
registerHandler<EnterScoreBody>(WRITE.enterScore, {
  send: (body) => teachingService.enterScore(body),
  idempotent: true,
  collectionId: SET.teachingResults,
})

/**
 * Recording a topic covered.
 *
 * **Not** idempotent: it creates a row the school gives an id to, so replaying
 * one that may already have been received would file the lesson twice. There
 * are no idempotency keys on this API and nothing on the device can tell
 * whether the school heard it, so an op interrupted in flight goes to the
 * drawer for a person to decide.
 */
registerHandler<CreateTopicBody>(WRITE.addTopic, {
  send: (body) => teachingService.addTopic(body),
  idempotent: false,
  newId: idUnder('topic'),
  collectionId: SET.teachingTopics,
})

/** Correcting one. Idempotent — it writes the same fields over the same row. */
registerHandler<{ id: Id; body: UpdateTopicBody }>(WRITE.updateTopic, {
  send: ({ id, body }) => teachingService.updateTopic(id, body),
  idempotent: true,
  collectionId: SET.teachingTopics,
})

/**
 * A message to the office, and one to the students of an arm.
 *
 * **Not** idempotent — each send is a fresh mail, so a replay of one that may
 * already have gone out is the same message in everybody's inbox twice. An op
 * interrupted in flight goes to the drawer for a person to decide, exactly as
 * a topic does.
 */
registerHandler<MessageAdminBody>(WRITE.messageAdmin, {
  send: (body) => teachingService.messageAdmin(body),
  idempotent: false,
  newId: noNewId,
})

registerHandler<MessageStudentsBody>(WRITE.messageStudents, {
  send: (body) => teachingService.messageStudents(body),
  idempotent: false,
  newId: noNewId,
})

/**
 * The teacher's own phone and address. Idempotent — the same fields over the
 * same record, however many times it is sent.
 */
registerHandler<UpdateMyTeachingProfileBody>(WRITE.updateTeachingProfile, {
  send: (body) => teachingService.updateProfile(body),
  idempotent: true,
})
