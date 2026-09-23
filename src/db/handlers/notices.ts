import { noticesService } from '@/api/notifications/service'
import type { NoticeBody, NoticeEditBody } from '@/api/notifications/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { noNewId } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The notice board, written from the office and sent when there is a
 * connection.
 *
 * The first **create** in this app to go through the queue, which is what makes
 * it the one that exercises temp ids: the school issues a notice's id, so the
 * device names the row `local:<uuid>` until the answer comes back and the id
 * map learns what the school called it.
 */

/**
 * Posting one is **not** idempotent — it makes a row the school gives an id to,
 * so replaying one that may already have been received would put the same
 * notice on the board twice. There are no idempotency keys on this API and
 * nothing on the device can tell whether the school heard it, so an op
 * interrupted in flight goes to the drawer for a person to decide.
 */
registerHandler<NoticeBody>(WRITE.postNotice, {
  send: (body) => noticesService.post(body),
  idempotent: false,
  // `POST /notifications` is typed `unknown` — nobody has written down what
  // it answers with, so there is no key to read the new notice's id out of.
  // Nothing asks for it today: the queued notice is drawn from the op and
  // replaced by the school's own copy when the board refetches. The day
  // something queues a write against a notice not yet posted, this is the
  // line that has to be filled in.
  newId: noNewId,
  collectionId: SET.refBoard,
})

/** Correcting one. Idempotent — it writes the same fields over the same row. */
registerHandler<{ id: Id; body: NoticeEditBody }>(WRITE.editNotice, {
  send: ({ id, body }) => noticesService.edit(id, body),
  idempotent: true,
  collectionId: SET.refBoard,
})

/**
 * Taking one down. Idempotent in the way that matters: a notice deleted twice
 * is a notice that is gone, and the second refusal is a 404 the drain treats as
 * terminal rather than as work lost.
 */
registerHandler<Id>(WRITE.removeNotice, {
  send: (id) => noticesService.remove(id),
  idempotent: true,
  collectionId: SET.refBoard,
})
