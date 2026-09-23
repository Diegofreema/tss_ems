import { queryOptions } from '@tanstack/react-query'
import type { Account } from '@/api/auth/types'
import { myFamilyKeys } from '@/api/parents/keys'
import { myFamilyService } from '@/api/parents/service'
import type { Child as EnrolledChild, Parent } from '@/api/parents/types'
import { queryClient } from '@/lib/query-client'
import { familyChild, WEEKS_DRAWN, type Child, type Mark } from '../family'

/**
 * The guardian record behind the signed-in account, when there is one.
 *
 * Nothing below is scoped by it any more — every read resolves the household
 * from the token — but it still says whether the caller is a guardian at all,
 * and it keys the cache so signing in as someone else refetches.
 */
export function parentIdOf(account: Account | null | undefined): number | null {
  const type = account?.profile_type
  if (type !== 'parent' && type !== 'sparent') return null
  return (account?.profile as Parent | undefined)?.id ?? null
}

/**
 * A week either side of the window the chart draws, so a mark on its first
 * Monday is not lost to a timezone.
 */
const MARK_DAYS = (WEEKS_DRAWN + 1) * 7

/**
 * Invoices for the whole household in one page. A family years behind runs to
 * a few dozen, not a few hundred, and the endpoint pages if it ever does.
 */
export const INVOICE_SCAN = 200

/**
 * The household's ledger, asked for through the cache on the key
 * `useMyChildrenInvoices` uses.
 *
 * This page is not its only reader — the notification feed reads the same
 * bills as the events that raised them — and two readers on two keys would be
 * two requests for one answer.
 */
export const familyLedger = () =>
  queryClient.ensureQueryData({
    queryKey: myFamilyKeys.invoices({ limit: INVOICE_SCAN }),
    queryFn: () => myFamilyService.invoices({ limit: INVOICE_SCAN }),
  })

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * The register for each child, asked for one child at a time.
 *
 * There is no household-wide register: `my-children/{id}/attendance` is the
 * only one a guardian may read, so this costs a request per child. A child
 * whose register refuses is drawn with no marks rather than taking the page
 * down with them — the bars are the least of what this page is for.
 */
function marksFor(children: EnrolledChild[], from: string, to: string) {
  return Promise.all(
    children.map((child) =>
      myFamilyService
        .childAttendance(child.id, { start_date: from, end_date: to })
        .then((answer) => answer.attendance as Mark[])
        .catch((): Mark[] => []),
    ),
  )
}

/**
 * The household, as the parent portal reads it.
 *
 * Three endpoints, all of them the guardian's own — the caller is resolved
 * from the token and no id is sent anywhere:
 *
 * - `sparents/my-children` — who the children are, so a child with nothing
 *   billed against them still appears in the switcher
 * - `sparents/my-invoices` — every invoice raised against every child, in one
 *   call. It is the only read here that answers for the household rather than
 *   for one pupil
 * - `sparents/my-children/{id}/attendance` — the marks, one child at a time
 *
 * This portal used to read `sparents/{id}/children`, `admin-attendances/report`
 * and the counter's per-pupil ledgers instead, because the deployment resolved
 * every caller to user 1 and the `my-*` routes answered "No parent record is
 * linked to this account" whatever token was presented. Bronze started
 * identifying the caller on 2026-09-01 and those three now answer "This
 * endpoint is restricted to administrators." for a guardian, which is what
 * moved these reads onto the routes that were always meant to serve them.
 *
 * The children are fetched first rather than alongside: the register is asked
 * for per child, so their ids have to be known before it can be.
 */
export function familyQuery(parentId: number | null) {
  return queryOptions({
    queryKey: ['parent', 'family', parentId],
    queryFn: async (): Promise<Child[]> => {
      if (parentId === null) return []

      const today = new Date()
      const from = new Date(today)
      from.setDate(from.getDate() - MARK_DAYS)

      const enrolled = await myFamilyService.children()
      if (enrolled.length === 0) return []

      const [billed, marks] = await Promise.all([
        familyLedger().then((page) => page.items),
        marksFor(enrolled, isoDay(from), isoDay(today)),
      ])

      return enrolled.map((child, index) =>
        familyChild(
          child,
          billed.filter((invoice) => invoice.student_id === child.id),
          marks[index],
          today,
        ),
      )
    },
  })
}
