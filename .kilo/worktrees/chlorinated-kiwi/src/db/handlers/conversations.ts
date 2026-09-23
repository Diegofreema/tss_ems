import { conversationsService } from '@/api/conversations/service'
import type { ReplyBody, StartConversationBody } from '@/api/conversations/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { noNewId } from '../new-id'
import { registerHandler } from '../registry'

/**
 * Messages written on the device and sent when there is a connection.
 *
 * This is the case the queue was built for, put to its plainest use: a
 * guardian reads a teacher's message on a phone with no signal, answers it,
 * puts the phone away, and the answer goes when the phone next finds a
 * network. Nothing about that is allowed to depend on the network being there
 * at the moment they press send.
 *
 * Both refetch the inbox rather than the contacts list: the thread they change
 * is what the inbox lists, and who may be written to has not moved.
 */

/**
 * Starting a thread is **not** idempotent — the school issues the
 * conversation's id, so replaying one that may already have been received
 * would open the same conversation twice and split the answers between them.
 * This API has no idempotency keys and nothing on the device can tell whether
 * the school heard it, so an op interrupted in flight goes to the drawer for a
 * person to decide.
 *
 * Writing to somebody off the contacts list is a 403 the drain treats as
 * terminal, which is right: no amount of retrying makes it allowed, and the
 * refusal carries the sentence saying what to do instead.
 */
registerHandler<StartConversationBody>(WRITE.startConversation, {
  send: (body) => conversationsService.start(body),
  idempotent: false,
  // Unfired: bronze has never run this endpoint, so its answer is typed
  // `unknown` and there is no key to name here. A reply queued against a
  // thread this device started would need it — see the note on the reply
  // below, which is why the compose screen does not offer one.
  newId: noNewId,
  collectionId: SET.msgInbox,
})

/**
 * A reply is not idempotent either, and for a reason worth spelling out: it
 * appends a message rather than writing over one, so sending it twice says the
 * same thing twice in front of a teacher. A closed thread answers 409 —
 * terminal, and the drawer shows the reply so it can be copied elsewhere
 * rather than losing what was written.
 */
registerHandler<{ id: Id; body: ReplyBody }>(WRITE.replyToConversation, {
  send: ({ id, body }) => conversationsService.reply(id, body),
  idempotent: false,
  // A reply creates a message, but nothing on the device ever names one:
  // the thread is the row, and it already has the school's id.
  newId: noNewId,
  collectionId: SET.msgInbox,
})
