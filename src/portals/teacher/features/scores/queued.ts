import type { EnterScoreBody } from '../../../../api/teaching/types.ts'
import { WRITE } from '../../../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../../../db/outbox.ts'

/** A mark written down on this device and not yet with the school. */
export type QueuedScore = { ca: number; exam: number }

/** How a queued mark is found again: one student, one subject. */
export const scoreKey = (subjectId: number, studentId: number) =>
  `${subjectId}:${studentId}`

/**
 * The marks this device is still holding for a sheet.
 *
 * Keyed on the subject and the student, which is how the endpoint keys them
 * too — so a mark queued twice for the same child reads as one mark, the last
 * one the teacher typed.
 *
 * Only ops still expected to land. A refused one is not going to, and drawing
 * it as a mark would tell the teacher a score was filed when the school said
 * no; that op belongs to the pending-work drawer, where it can be retried or
 * discarded by a person.
 */
export function queuedScores(ops: readonly OutboxOp[]): Map<string, QueuedScore> {
  const held = new Map<string, QueuedScore>()

  const mine = ops
    .filter((op) => op.handler === WRITE.enterScore && DRAWN_STATES.includes(op.state))
    .sort((one, two) => one.seq - two.seq)

  for (const op of mine) {
    const body = op.payload as EnterScoreBody | undefined
    if (!body) continue
    held.set(scoreKey(Number(body.subject_id), Number(body.student_id)), {
      ca: Number(body.ca),
      exam: Number(body.exam),
    })
  }

  return held
}
