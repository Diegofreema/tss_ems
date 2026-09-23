import type { Id } from '../types'
import type { InboxParams } from './types'

/**
 * Every key here is scoped to the token, so no account id appears in one —
 * two logins never share a cache, because signing out wipes the device.
 *
 * They sit under a single root on purpose: a reply, a new thread, a read-mark
 * and a close each change what the inbox and the badge say, and one
 * `invalidateQueries({ queryKey: conversationKeys.all })` covers the lot.
 */
export const conversationKeys = {
  all: ['conversations'] as const,
  /** Who this account may write to. Relationship-derived, so it moves rarely. */
  contacts: () => [...conversationKeys.all, 'contacts'] as const,
  /** The inbox whatever it was asked for — what a new message invalidates. */
  everyInbox: () => [...conversationKeys.all, 'inbox'] as const,
  inbox: (params: InboxParams) => [...conversationKeys.everyInbox(), params] as const,
  unread: () => [...conversationKeys.all, 'unread'] as const,
  /** Stringified, so `30` and `'30'` are not two entries for one thread. */
  thread: (id: Id) => [...conversationKeys.all, 'thread', String(id)] as const,
}
