import type {
  ConversationSummary,
  ReplyBody,
  StartConversationBody,
} from '../../api/conversations/types.ts'
import { WRITE } from '../../db/ids.ts'
import { DRAWN_STATES, type OutboxOp } from '../../db/outbox.ts'
import { plainText } from '../collections/rich-text.ts'
import type { ThreadMessage } from './thread.ts'

/**
 * What this device has said that the school has not heard.
 *
 * Read off the outbox rather than written into the collection: an optimistic
 * write into the inbox is wiped by the next sync, which for a thread is any
 * refetch before the op lands, and the reply would vanish out from under
 * somebody who had just typed it. An overlay read from the queue exists
 * exactly as long as the op does, and disappears when the school's own answer
 * takes its place.
 *
 * Only ops still expected to land are drawn. A `failed` one would tell a
 * guardian their message was sent when the school refused it; that op belongs
 * to the pending-work drawer, where a person can retry it or copy the words
 * out.
 */

/** A reply typed on this device, sitting in the thread where it will land. */
export function queuedReplies(
  ops: readonly OutboxOp[],
  conversationId: number | string,
): ThreadMessage[] {
  return mine(ops, WRITE.replyToConversation)
    .filter((op) => {
      const payload = op.payload as { id?: unknown } | undefined
      return String(payload?.id ?? '') === String(conversationId)
    })
    .map((op) => {
      const payload = op.payload as { body?: ReplyBody } | undefined
      return {
        key: `queued:${op.id}`,
        body: payload?.body?.body ?? '',
        senderId: undefined,
        senderName: '',
        at: '',
        mine: true,
        queued: true,
      }
    })
}

/**
 * A conversation started on this device and not yet opened at the school.
 *
 * Drawn at the top of the inbox as a real row, because to the person who wrote
 * it that is what it is — and marked, because it has no id yet and cannot be
 * opened: the school has not said what to call it. Its own `id` is the op's,
 * negated, so it can never collide with a conversation the school issued.
 */
export function queuedThreads(ops: readonly OutboxOp[]): ConversationSummary[] {
  return mine(ops, WRITE.startConversation).map((op, index) => {
    const body = op.payload as StartConversationBody | undefined
    return {
      id: -(index + 1),
      subject: body?.subject ?? '',
      status: 'open',
      student_id: body?.student_id === undefined ? null : Number(body.student_id),
      about: null,
      with: [],
      /*
       * The words, not the markup. A body is written in the editor now, and
       * the inbox row is one line of preview text beside a subject — the
       * school's own `last_message` is a sentence, and a queued row showing
       * `<p>` beside it would be the only row in the list wearing its tags.
       */
      last_message: plainText(body?.body ?? ''),
      last_message_at: null,
      unread: 0,
    }
  })
}

/** True for a row `queuedThreads` made, which has no server id to open. */
export const isQueuedThread = (thread: ConversationSummary): boolean => thread.id < 0

function mine(ops: readonly OutboxOp[], handler: string): OutboxOp[] {
  return ops
    .filter((op) => op.handler === handler && DRAWN_STATES.includes(op.state))
    .sort((one, two) => one.seq - two.seq)
}
