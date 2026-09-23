import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { conversationKeys } from './keys'
import { conversationsService } from './service'

/**
 * What is left on the query path once messages went local-first.
 *
 * The two reads that are sets on the device are **not** here: the contacts
 * list and the inbox are collections in `src/db/collections/messages.ts`, and
 * the two writes that make a message — starting a thread and replying — are
 * outbox handlers in `src/db/handlers/conversations.ts`, called straight from
 * the composer. That is the whole reason this family exists: a guardian
 * answers a teacher on a phone with no signal, and the answer goes when the
 * phone next finds a network.
 *
 * These three stay on the wire, each for its own reason, which is the comment
 * CLAUDE.md asks a plain `useQuery`/`useMutation` for:
 *
 * - **One thread** cannot be a set, because fetching it *marks it read*. A
 *   collection that refetches on a schedule would clear somebody's unread
 *   count without anybody having looked at anything. It goes back on the
 *   device the day that side effect is split off the fetch.
 * - **The read-mark** is a badge, and a badge queued for tomorrow is a badge
 *   that lies today and then clears itself twice.
 * - **Closing a thread** is the office's moderation, done at a desk with a
 *   signal, not a teacher's work in a classroom without one.
 */

/**
 * One thread.
 *
 * **Fetching this marks the thread read**, so it is deliberately awkward to
 * fire by accident: no retry, and never preloaded from a route loader.
 * `enabled` is the caller's own switch for the same reason — a panel that is
 * not open has not been opened.
 *
 * `networkMode: 'always'` so that with no connection it *fails* rather than
 * pausing. A paused query never settles, and the thread panel would shimmer
 * for ever where it could have said, in a sentence, that the messages
 * themselves need a connection and the last one is on the row behind it.
 */
export function useConversation(id: Id | undefined, enabled = true) {
  return useQuery({
    queryKey: conversationKeys.thread(id ?? ''),
    queryFn: () => conversationsService.thread(id!),
    enabled: enabled && id !== undefined,
    retry: false,
    networkMode: 'always',
  })
}

/**
 * Marks one thread read from the list, without opening it. Silent: the reader
 * ticked a row off, they do not need to be told they did.
 *
 * The inbox is resynced by `dropDerivedReads`, which every mutation goes
 * through — so the badge, which reads the inbox document's own total, follows
 * without this hook knowing the badge exists.
 */
export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => conversationsService.markRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
  })
}

/** Administrators only — the office moderates these threads. */
export function useCloseConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => conversationsService.close(id),
    meta: { success: 'Conversation closed' },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
  })
}
