import { Link } from '@tanstack/react-router'
import { Lock, Search } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import { useSearch } from '@/api/search/hooks'
import type { SearchRow } from '@/api/search/types'
import { Shimmer } from '@/components/feedback/shimmer'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Input } from '@/components/ui/input'
import { useDebounced } from '@/hooks/use-debounced'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { staffKey } from '../../collections/staff-row'
import { countLine, type Group, groups, MIN_TERM, summary, tooShort } from './search'

/** How long the box waits after the last keystroke before asking the school. */
const SETTLE_MS = 500

/**
 * The office's one search box, across the student, guardian and staff registers.
 *
 * Somebody rings the office about "Okafor" and it could be the student, the
 * father who pays the fees, or the teacher who takes them for English. Every
 * other register in this portal makes you decide which before you can look.
 *
 * Deliberately on the query path, and one of only two places in the app that
 * is: this searches the whole of three registers at the school — across
 * registration numbers, e-mails, sign-in usernames, middle names and both
 * guardians' phone numbers, with the words matched separately — none of which
 * the device could reproduce over the couple of hundred rows it holds.
 *
 * The one thing this screen must get right is the difference between "nobody
 * called that" and "you are not allowed to look". Students and Sparents both
 * sit behind the Student privilege, so an administrator without it gets
 * neither — and showing that as "no results" would tell them the school has no
 * such student when it may well have.
 */
export function AdminSearchPage() {
  const [state, setState] = useQueryStates({
    q: parseAsString.withDefault(''),
    limit: parseAsString.withDefault('10'),
  })

  /*
   * One request per settled term rather than one per keystroke, and a longer
   * wait than the app's 300ms default.
   *
   * This box is the most expensive search in the portal — the school reads the
   * whole of three registers for it, across names, registration numbers,
   * e-mails, usernames and both guardians' phones — so a request thrown away
   * because somebody was still typing costs more here than anywhere else. Half
   * a second is about the gap between words in a name, which is the point at
   * which an answer is worth asking for.
   *
   * The box itself stays on the live value; only what gets asked for lags. The
   * hook also keeps the previous answer on screen while the next is in flight,
   * so a list never blanks into what reads as "no results" mid-typing.
   */
  const settled = useDebounced(state.q, SETTLE_MS)
  const { data, isPending, isFetching, error } = useSearch({
    q: settled,
    limit: Number(state.limit) || 10,
  })

  const asked = settled.trim().length >= MIN_TERM
  const found = groups(data)

  return (
    <div>
      <PageHeader
        kicker="School"
        title="Search"
        description="One term across the student, guardian and staff registers. Words are matched separately, so “Chidi Okafor” finds a name split across two columns, and a phone number matches however it was typed."
      />
      <Rule />

      <div className="flex flex-wrap items-end gap-3.5">
        <div className="relative min-w-[15rem] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            autoFocus
            value={state.q}
            onChange={(event) => void setState({ q: event.target.value })}
            placeholder="A name, an admission number, a phone number, an e-mail"
            aria-label="Search the school"
            className="h-10 pl-9 text-base"
          />
        </div>
        <div>
          <div className="mb-1.25 text-xs text-foreground/70">Per register</div>
          <select
            value={state.limit}
            aria-label="How many to show per register"
            onChange={(event) => void setState({ limit: event.target.value })}
            className="h-10 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {['10', '25', '50'].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 min-h-[1.25rem] text-sm text-muted-foreground">
        {tooShort(state.q)
          ? 'Type at least two characters.'
          : !asked
            ? 'Also searches registration numbers, e-mails, the username somebody signs in with, a student’s middle name, and both guardians’ names and phones.'
            : isFetching && !data
              ? 'Looking…'
              : summary(data, settled)}
      </p>

      <Rule />

      {error ? (
        <p className="rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
          {errorMessage(error, OFFLINE_MESSAGE)} This search asks the school
          about the whole of three registers, so it needs a connection — the
          registers themselves are on this device and can be opened from the
          menu.
        </p>
      ) : !asked ? (
        <div className="rounded-xl border border-dashed border-divider px-6 py-16 text-center">
          <div className="mx-auto max-w-[46ch]">
            <div className="font-heading text-lg font-extrabold">
              Search the whole school at once
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              One box for students, guardians and staff — for when whoever is on
              the telephone could be any of the three.
            </p>
          </div>
        </div>
      ) : isPending ? (
        <div className="grid gap-5 @xl/page:grid-cols-2 @4xl/page:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Shimmer key={index} className="h-64 w-full rounded-xl" delay={index * 80} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 @xl/page:grid-cols-2 @4xl/page:grid-cols-3">
          {found.map((group) => (
            <GroupCard key={group.register} group={group} term={settled} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group, term }: { group: Group; term: string }) {
  return (
    <section className="animate-ems-up overflow-hidden rounded-xl border border-divider bg-raised shadow-card">
      <header className="flex items-baseline gap-2.5 border-b border-divider px-4 py-3">
        <h3 className="flex-1 font-heading text-sm font-extrabold">{group.heading}</h3>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {countLine(group)}
        </span>
      </header>

      {!group.searched ? (
        <div className="flex gap-2.5 px-4 py-8 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 flex-none" strokeWidth={2} />
          <p>
            This register was not searched — your account does not hold the
            privilege for it, so there may well be matches you cannot see. Ask a
            Super Admin if you need it.
          </p>
        </div>
      ) : group.rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing here matches “{term}”.
        </p>
      ) : (
        <ul className="divide-y divide-divider">
          {group.rows.map((row) => (
            <li key={`${row.kind}-${row.id}`}>
              <Link
                to="/admin/$collection/$recordId"
                params={{ collection: collectionOf(row), recordId: recordIdOf(row) }}
                className="block px-4 py-3 transition-colors hover:bg-foreground/5"
              >
                <div className="truncate text-sm font-medium">{row.name}</div>
                {/* Both of these arrive already joined with a middle dot; they
                    are shown as they came rather than split, since an address
                    can contain the separator. */}
                {row.detail && (
                  <div className="mt-0.5 truncate text-2xs text-muted-foreground">
                    {row.detail}
                  </div>
                )}
                {row.contact && (
                  <div className="mt-0.5 truncate text-2xs tabular-nums text-muted-foreground">
                    {row.contact}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {group.searched && group.rows.length < group.total && (
        <div className="border-t border-divider px-4 py-2.5 text-2xs text-muted-foreground">
          {group.total - group.rows.length} more not shown — narrow the term, or
          raise the number per register.
        </div>
      )}
    </section>
  )
}

/**
 * Where a hit opens.
 *
 * By `kind` and `id`, never by the `url` the row carries: that is a CakePHP
 * route array naming the school's own server-rendered controllers, not this
 * portal's routes.
 */
function collectionOf(row: SearchRow): string {
  if (row.kind === 'student') return 'students'
  if (row.kind === 'parent') return 'parents'
  return 'staff-teachers'
}

/**
 * The staff register mixes teaching and office records, so its rows are keyed
 * by kind as well as id — a bare number there would be ambiguous. Search only
 * ever returns teachers under `teachers`, so the key is a teaching one.
 */
function recordIdOf(row: SearchRow): string {
  return row.kind === 'teacher' ? staffKey('teacher', row.id) : String(row.id)
}
