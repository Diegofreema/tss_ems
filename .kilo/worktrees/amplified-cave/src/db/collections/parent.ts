import { myFamilyService } from '@/api/parents/service'
import type { Child as EnrolledChild, FamilyInvoice } from '@/api/parents/types'
import type { Mark } from '@/portals/parent/family'
import { schoolCollection } from '../collection'
import { SET } from '../ids'
import { mergeHeld } from '../merge-held'
import { readSnapshot } from '../snapshot'
import { myNotices } from './my-notices'
import { serverNow } from '@/lib/server-clock'

/**
 * The household, on the guardian's own device.
 *
 * Three sets rather than one composed answer, because that is what makes them
 * joinable and what keeps derived text out of the database: a `Child` as the
 * screens read it carries formatted invoice rows and a drawn attendance chart,
 * and none of that should survive a change of copy, let alone be written to
 * disk. So the school's own shapes are stored and the reading is done live.
 *
 * Every one of these is token-scoped at the endpoint — `sparents/my-*` resolves
 * the caller and answers for their household alone — so no other family's rows
 * ever reach this device. That is the rule the skill asks for: filter at the
 * fetch, not at the query.
 */

/** Who the children are, so one with nothing billed still appears. */
export const parentChildren = schoolCollection<EnrolledChild, number>({
  id: SET.parentChildren,
  fetch: () => myFamilyService.children(),
  getKey: (child) => child.id,
  schemaVersion: 1,
})

/**
 * Invoices for the whole household in one page.
 *
 * A family years behind runs to a few dozen, not a few hundred. The limit is
 * the one `familyQuery` already used.
 */
export const INVOICE_SCAN = 200

export const parentInvoices = schoolCollection<FamilyInvoice, number>({
  id: SET.parentInvoices,
  fetch: () =>
    myFamilyService.invoices({ limit: INVOICE_SCAN }).then((page) => page.items),
  getKey: (invoice) => invoice.id,
  schemaVersion: 1,
})

/** A mark, with the child it belongs to and a key of its own. */
export type ChildMark = Mark & {
  /** `<childId>:<date>` — the register holds one mark per child per day. */
  id: string
  childId: number
}

/**
 * A week either side of the window the chart draws, so a mark on its first
 * Monday is not lost to a timezone.
 */
const MARK_DAYS = (6 + 1) * 7

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Every child's register, flattened into one set.
 *
 * There is no household-wide register — `my-children/{id}/attendance` is the
 * only one a guardian may read — so this still costs a request per child. A
 * child whose register refuses keeps the marks the device already held for
 * them rather than taking the household down with them — see the note on the
 * fetch.
 *
 * Whose children they are is read off the copy the children collection already
 * keeps, and only asked for when there is none.
 *
 * Deliberately not `queryClient.query`, which would have deduplicated it
 * nicely and then hung: that carries the app's default network mode, so with
 * no connection it pauses the request instead of failing it, the fetch never
 * settles, and the collection sits in `loading` for as long as the device is
 * offline — taking the route loader waiting on it down too. A collection's
 * fetcher must always be able to finish.
 */
export const parentAttendance = schoolCollection<ChildMark, string>({
  id: SET.parentAttendance,
  fetch: async () => {
    const children =
      readSnapshot<EnrolledChild>(SET.parentChildren) ?? (await myFamilyService.children())

    // Today by the school's clock, not this device's — the same anchor the
    // register window uses, and for the same reason.
    const today = new Date(serverNow())
    const from = new Date(today)
    from.setDate(from.getDate() - MARK_DAYS)

    /*
     * A child whose register refuses keeps the marks the device already held
     * for them. What this fetch returns becomes the collection's whole state
     * *and* its snapshot, so resolving a failed child as "no marks" did not
     * draw an empty chart for a moment — it erased the school's last answer
     * for that child, on the one kind of connection (`navigator.onLine` true,
     * requests dying) that gets past the offline guard in `schoolCollection`.
     * The held marks are kept whole rather than re-windowed: at worst they
     * trail the moving window by the days since the last good sync, which is
     * more truth, not less.
     */
    const held = new Map<number, ChildMark[]>()
    for (const mark of readSnapshot<ChildMark>(SET.parentAttendance) ?? []) {
      const marks = held.get(mark.childId)
      if (marks) marks.push(mark)
      else held.set(mark.childId, [mark])
    }

    const results = await Promise.all(
      children.map(async (child) => ({
        key: child.id,
        fresh: await myFamilyService
          .childAttendance(child.id, {
            start_date: isoDay(from),
            end_date: isoDay(today),
          })
          .then((answer) => {
            /*
             * One mark per child per day, decided here rather than left to
             * the keyed collection to collapse silently. The key is the date
             * because the school takes one register a day today; should it
             * ever send two — a morning and an afternoon — the later entry
             * in its own answer wins, which is at least a decision written
             * down where the key's assumption is.
             */
            const byDay = new Map<string, ChildMark>()
            for (const mark of answer.attendance as Mark[]) {
              const id = `${child.id}:${mark.attendance_date}`
              byDay.set(id, { ...mark, childId: child.id, id })
            }
            return [...byDay.values()]
          })
          .catch(() => undefined),
      })),
    )

    return mergeHeld(results, held).flat()
  },
  getKey: (mark) => mark.id,
  schemaVersion: 1,
})

/** Everything the parent portal keeps on the device. */
export const parentCollections = [parentChildren, parentInvoices, parentAttendance, myNotices]
