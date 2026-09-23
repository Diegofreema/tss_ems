import { useLiveQuery } from '@tanstack/react-db'
import { MessageSquarePlus, Search } from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useCallback, useState } from 'react'
import { useCloseConversation } from '@/api/conversations/hooks'
import type { Contact, ConversationSummary } from '@/api/conversations/types'
import { SegmentedControl } from '@/components/common/segmented-control'
import { EmptyState } from '@/components/feedback/empty-state'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { msgContacts, msgInbox } from '@/db/collections/messages'
import { useHeld, useHeldDocument } from '@/db/live'
import type { OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import type { Option } from '@/features/collections/options'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { useSessionStore } from '@/stores/session.store'
import { filterCounts, THREAD_FILTERS, type ThreadFilter, visibleThreads } from '../inbox'
import { FIRST_PAGE, hasMore, NEXT_PAGE, pageOf, windowFor } from '../paging'
import { queuedReplies, queuedThreads } from '../queued'
import { ComposeDialog } from './compose-dialog'
import { ThreadList } from './thread-list'
import { ThreadView } from './thread-view'

/**
 * The messages screen, shared by the office, the staff room and the guardian.
 *
 * One component for three portals because the answer is the same in all three:
 * the school works out who each account may write to and what threads they are
 * on, so nothing here is per-role except whether the reader may close a thread
 * and whether they have children to name one about.
 *
 * A student has no page of this kind, and that is the API's decision rather than
 * an omission — a student's contacts list is empty, because their messages to
 * the school go through their guardian.
 *
 * Everything on screen is read off the device: the threads, the last message
 * on each and the address book behind the composer. Only the messages inside
 * an open thread need a connection, and the panel says so where there is none
 * rather than spinning.
 */
export function MessagesPage({
  kicker,
  description,
  canClose = false,
  childOptions,
  childLabel,
}: {
  kicker: string
  description: string
  /** The office alone may close a thread. */
  canClose?: boolean
  /** The reader's own children, where the portal knows them. */
  childOptions?: Option[]
  childLabel?: string
}) {
  const [state, setState] = useQueryStates({
    thread: parseAsString.withDefault(''),
    status: parseAsStringLiteral(THREAD_FILTERS).withDefault('open'),
    q: parseAsString.withDefault(''),
  })
  const [composing, setComposing] = useState(false)
  const narrow = useBreakpoint('narrow')

  const inbox = useHeldDocument(msgInbox)
  const contacts = useHeld<Contact, number>(msgContacts)
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })
  const ops = (queue.data ?? []) as OutboxOp[]
  const meId = useSessionStore((session) => session.account?.user?.id)
  const closeThread = useCloseConversation()

  /**
   * The school's threads, with anything started on this device in front of
   * them — to the person who wrote it, a message waiting to send is a
   * conversation, and leaving it off the list until the school answers is how
   * somebody comes to write it twice.
   *
   * Recomputed rather than memoised: it is a concatenation over an inbox and a
   * queue, both of which are a handful of rows, and the live query hands back
   * a new array every render anyway — so a memo here would be a dependency
   * that never matches, doing the work twice.
   */
  const threads = [...queuedThreads(ops), ...(inbox.doc?.conversations ?? [])]

  const counts = filterCounts(threads)
  const shown = visibleThreads(threads, state.status, state.q)

  /*
   * How many rows the list is drawing. The inbox itself is held whole — the
   * endpoint sends it whole whatever it is asked for — so this pages the
   * drawing rather than the fetching; see `../paging.ts`.
   */
  const [drawn, setDrawn] = useState(FIRST_PAGE)

  /*
   * A new filter or a new search term is a different list, and a window opened
   * over the old one would drop the reader halfway down a result they have not
   * scrolled. Reset while rendering rather than in an effect: this is state
   * adjusted because the input changed, not React synchronised with anything
   * outside it, and an effect would render the stale window first and then
   * render again.
   */
  const listKey = `${state.status}|${state.q}`
  const [lastKey, setLastKey] = useState(listKey)
  if (listKey !== lastKey) {
    setLastKey(listKey)
    setDrawn(FIRST_PAGE)
  }

  const total = shown.length
  const selectedIndex = shown.findIndex((thread) => String(thread.id) === state.thread)

  // A thread opened from the URL — a reload, a shared link, the back button —
  // may sit below the window, and its row belongs in the list beside the
  // conversation it opened. Derived, not stored: there is nothing to remember.
  const reach = windowFor(selectedIndex, drawn)
  const page = pageOf(shown, reach)
  const more = hasMore(total, reach)
  /*
   * The list says how many rows it is currently drawing and this adds to that,
   * rather than adding to `drawn` — a window stretched to reach a deep-linked
   * thread is wider than `drawn` says, and growing from the narrower number
   * would ask for rows already on screen and fire the observer straight back.
   *
   * Taking it as an argument is also what keeps this callback one identity for
   * the life of the page. It is the observer's dependency, and a new one every
   * render would tear the observer down and rebuild it every render.
   */
  const drawMore = useCallback((rendered: number) => setDrawn(rendered + NEXT_PAGE), [])

  const selected =
    shown[selectedIndex] ??
    threads.find((thread) => String(thread.id) === state.thread) ??
    null

  const select = (thread: ConversationSummary) =>
    void setState({ thread: String(thread.id) })

  const header = (
    <>
      <PageHeader
        kicker={kicker}
        title="Messages"
        description={description}
        action={
          <Button onClick={() => setComposing(true)}>
            <MessageSquarePlus className="size-4" strokeWidth={2} />
            New message
          </Button>
        }
      />
      <Rule />
    </>
  )

  // Never synced, and no connection to sync now. Distinct from an empty inbox,
  // which is a real and common answer — saying "no messages" over a set this
  // device has never seen is the one wrong thing this page could say.
  if (inbox.failed && !inbox.doc) {
    return (
      <div>
        {header}
        <EmptyState
          title="Your messages are not on this device yet"
          body="This device has never been able to fetch your conversations, and cannot reach the school now. Open this page once with a connection and they will be here from then on, signal or no signal."
        />
      </div>
    )
  }

  /*
   * On a phone a conversation is its own screen, not a panel under the
   * inbox's furniture.
   *
   * The two panes already swapped at this width, but the swap alone was not
   * the thing: the page title, the New message button, the Open/Closed/All
   * filters and the search box all stayed above the conversation, so opening
   * a thread on a 375px screen put roughly four hundred pixels of somebody
   * else's controls between the reader and the first message, and the reply
   * box wherever the bottom of the thread landed. That is a panel wearing a
   * screen's clothes, and it is why this did not feel like a messaging app.
   *
   * So the chat replaces the page rather than joining it: nothing above it but
   * its own header, which already carries the way back. The height is the
   * viewport less the shell's header and the page's own padding, and the
   * messages scroll inside it — which is what pins the reply box to the foot
   * where a thumb expects it.
   */
  if (narrow && selected)
    return (
      <div className="h-[calc(100dvh_-_var(--shell-header)_-_2*var(--spacing-content))] min-h-96">
        <ThreadView
          key={selected.id}
          thread={selected}
          meId={meId}
          queued={queuedReplies(ops, selected.id)}
          onBack={() => void setState({ thread: '' })}
          onClose={() => closeThread.mutate(selected.id)}
          closing={closeThread.isPending}
          canClose={canClose}
          full
        />
      </div>
    )

  return (
    <div>
      {header}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SegmentedControl<ThreadFilter>
          name="messages-filter"
          value={state.status}
          onChange={(status) => void setState({ status })}
          options={THREAD_FILTERS.map((filter) => ({
            value: filter,
            label: `${LABELS[filter]} (${counts[filter]})`,
          }))}
        />
        <div className="relative min-w-[13rem] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={state.q}
            onChange={(event) => void setState({ q: event.target.value })}
            placeholder="Search subjects and names"
            aria-label="Search your conversations"
            className="pl-8"
          />
        </div>
      </div>

      {/*
        Bounded, and the two panes scroll inside it.

        It used to be an unbounded grid: the list was as tall as the inbox was
        long, the conversation beside it stretched to match, and the reply box
        went wherever the bottom of that landed — measured at 1156px of grid on
        a 994px screen with ten threads, so the office was scrolling past every
        conversation it had to answer any one of them. Now the page itself does
        not grow with the inbox at all.

        `dvh` rather than a subtraction from the header, because what sits above
        this varies — the offline banner comes and goes, a portal may carry a
        context bar — and a floor keeps it usable on a short laptop screen.
        Narrow screens keep the ordinary page scroll: there is only ever one
        pane there, so there is nothing to pin.
      */}
      <div className="grid gap-5 lg:h-[calc(100dvh-17.5rem)] lg:min-h-104 @3xl/page:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        {/* Always drawn here: a narrow screen with a thread open has already
            returned above, as its own screen. */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-divider bg-raised shadow-card">
            {/* What scrolls on a wide screen. On a narrow one there is only
                ever one pane and the page scrolls instead, which is why the
                foot of the list is watched against the viewport rather than
                against this — see `ThreadList`. */}
            <div data-thread-scroll className="min-h-0 flex-1 overflow-y-auto">
              <ThreadList
                threads={page}
                selectedId={selected?.id ?? null}
                onSelect={select}
                hasMore={more}
                onMore={drawMore}
                emptyLine={
                  threads.length === 0
                    ? 'No conversations yet. Start one with the button above.'
                    : state.q
                      ? `Nothing matches “${state.q}”.`
                      : `Nothing ${LABELS[state.status].toLowerCase()} here.`
                }
              />
            </div>

            {/* Counted off the whole filtered set, not off the window, so it
                says what is there rather than what has been drawn so far. */}
            {total > 0 && (
              <div className="border-t border-divider px-4 py-2 text-2xs text-muted-foreground">
                Showing {page.length} of {total}
              </div>
          )}
        </div>

        {selected ? (
          <ThreadView
            // Keyed on the thread, so switching conversations starts the
            // panel afresh rather than showing the last one's reply box.
            key={selected.id}
            thread={selected}
            meId={meId}
            queued={queuedReplies(ops, selected.id)}
            onBack={() => void setState({ thread: '' })}
            onClose={() => closeThread.mutate(selected.id)}
            closing={closeThread.isPending}
            canClose={canClose}
          />
        ) : (
          <div className="hidden min-h-0 place-items-center rounded-xl border border-dashed border-divider px-6 py-16 text-center lg:grid">
              <div className="max-w-[34ch]">
                <div className="font-heading text-base font-extrabold">
                  Nothing open
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Choose a conversation on the left to read it, or start a new
                  one. Opening a conversation marks it read.
                </p>
              </div>
          </div>
        )}
      </div>

      <ComposeDialog
        open={composing}
        onOpenChange={setComposing}
        contacts={contacts.rows}
        contactsFailed={contacts.failed && contacts.rows.length === 0}
        childOptions={childOptions}
        childLabel={childLabel}
      />
    </div>
  )
}

const LABELS: Record<ThreadFilter, string> = {
  open: 'Open',
  closed: 'Closed',
  all: 'All',
}
