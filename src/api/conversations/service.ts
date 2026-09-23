import { request } from '../client'
import type { Id } from '../types'
import type {
  Contact,
  ConversationThread,
  InboxEnvelope,
  InboxParams,
  ReadResult,
  ReplyBody,
  StartConversationBody,
} from './types'

/**
 * Parents and staff writing to each other inside the system.
 *
 * Three reads and four writes. The contacts list, the inbox and the read-mark
 * are typed off live answers taken on 2026-09-08; the badge, the single
 * thread, the create, the reply and the close are unfired, and each says so.
 */
export const conversationsService = {
  /**
   * Who this account may start a conversation with, and why each of them is
   * on the list. A student's is empty by design, which is a sentence to show
   * rather than an error to raise.
   */
  contacts: () =>
    request<{ contacts: Contact[]; message: string | null }>('conversations/contacts').then(
      (answer) => {
        // A missing array is a shape change, not an empty address book. This
        // list is the complete state of a set once it is held on the device,
        // and answering `[]` there would say the school has nobody in it.
        if (!Array.isArray(answer.contacts)) {
          throw new Error('The server sent the contacts in a shape this app cannot read.')
        }
        return answer.contacts
      },
    ),

  /**
   * The caller's own threads, most recently active first. Handed on whole:
   * the envelope's `unread` is the whole-inbox total, which a list screen
   * shows beside the rows rather than fetching again.
   */
  inbox: (params: InboxParams = {}) =>
    request<InboxEnvelope>('conversations', { query: { ...params } }),

  /**
   * Just the badge number, cheap enough to poll — which is what it is for.
   *
   * **Unfired**, so which key carries the figure is unconfirmed: `/read`
   * answers with `unread`, and the notice board's equivalent answers with
   * `unread_count`, so both are read and the first one present wins. A shape
   * this cannot find reads as zero rather than throwing, because a badge that
   * cannot be worked out is a badge that is not shown.
   */
  unreadCount: () =>
    request<{ unread?: number; unread_count?: number }>('conversations/unread-count').then(
      (answer) => answer.unread ?? answer.unread_count ?? 0,
    ),

  /**
   * Starts a thread. Writing to somebody not on the contacts list is a 403
   * carrying the sentence to show; `ApiError.message` already holds it.
   */
  start: (body: StartConversationBody) =>
    request<unknown>('conversations', { method: 'POST', body }),

  /**
   * One thread, with its messages.
   *
   * **This read writes** — opening a thread marks it read for this account.
   * So it belongs to somebody deliberately opening a conversation, never to a
   * loader, a prefetch or a retry. See `ConversationThread`.
   */
  thread: (id: Id) => request<ConversationThread>(`conversations/${id}`),

  /** Everybody on a thread may reply. A closed thread answers 409. */
  reply: (id: Id, body: ReplyBody) =>
    request<unknown>(`conversations/${id}/reply`, { method: 'POST', body }),

  /**
   * Clears this account's unread count for one thread without opening it, and
   * answers with the total that is left.
   */
  markRead: (id: Id) =>
    request<ReadResult>(`conversations/${id}/read`, { method: 'POST', body: {} }),

  /** Administrators only. A closed conversation takes no more replies. */
  close: (id: Id) =>
    request<unknown>(`conversations/${id}/close`, { method: 'POST', body: {} }),
}
