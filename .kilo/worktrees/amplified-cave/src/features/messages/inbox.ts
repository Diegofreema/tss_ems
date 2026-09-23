import type {
  ConversationStatus,
  ConversationSummary,
  InboxEnvelope,
} from '../../api/conversations/types.ts'

/** What the inbox is showing. `all` is the office reading back a closed thread. */
export type ThreadFilter = 'open' | 'closed' | 'all'

export const THREAD_FILTERS: readonly ThreadFilter[] = ['open', 'closed', 'all']

/**
 * The threads, narrowed here rather than at the endpoint.
 *
 * `GET /conversations` takes `status` and `q`, and neither is asked for: a set
 * narrowed at the fetch cannot be widened again without a second request, and
 * there may be no connection to make one over. So the whole inbox is the set
 * on the device and the filter is a predicate — which is also why switching
 * between open and closed costs nothing and works with no signal at all.
 *
 * The search matches the subject and the names on the thread. The endpoint
 * searches the subject alone; this is wider, and wider is safe — the reader
 * typed a name because they were looking for a person.
 */
export function visibleThreads(
  threads: readonly ConversationSummary[],
  filter: ThreadFilter,
  term: string,
): ConversationSummary[] {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return threads.filter((thread) => {
    if (filter !== 'all' && (thread.status ?? 'open') !== filter) return false
    if (!words.length) return true
    const haystack = `${thread.subject ?? ''} ${withNames(thread)} ${thread.about ?? ''}`
      .toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * Everybody on a thread except the reader, in one line.
 *
 * The server has already left the reader out of `with`, so this is exactly
 * what a row should be titled by when the subject is blank — which it is
 * allowed to be.
 */
export function withNames(thread: ConversationSummary): string {
  return (thread.with ?? [])
    .map((person) => person.name?.trim())
    .filter(Boolean)
    .join(', ')
}

/** A row's heading: its subject, or who it is with when there is none. */
export function threadHeading(thread: ConversationSummary): string {
  return thread.subject?.trim() || withNames(thread) || 'Conversation'
}

/**
 * The badge figure.
 *
 * The envelope's own total, not a sum of the rows: the rows are what this
 * device last synced, and a total added up from them would drop below the
 * truth the moment the school held a thread this copy has not seen. Missing
 * or nonsense reads as nothing to show rather than as zero unread.
 */
export function inboxUnread(envelope: InboxEnvelope | undefined): number {
  const total = Number(envelope?.unread)
  return Number.isFinite(total) && total > 0 ? total : 0
}

/**
 * How many threads are in each of the three filters, for the tabs above the
 * list. Counted off the whole set, so a tab says what it will show before it
 * is opened.
 */
export function filterCounts(
  threads: readonly ConversationSummary[],
): Record<ThreadFilter, number> {
  let open = 0
  for (const thread of threads) if ((thread.status ?? 'open') === 'open') open += 1
  return { open, closed: threads.length - open, all: threads.length }
}

/** A closed thread takes no more replies, whoever is reading it. */
export function isClosed(status: ConversationStatus | null | undefined): boolean {
  return status === 'closed'
}
