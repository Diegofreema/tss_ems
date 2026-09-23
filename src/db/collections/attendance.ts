import { ApiError } from '@/api/client'
import { registerService } from '@/api/attendance/service'
import type { MyClass, StatusCatalogue } from '@/api/attendance/types'
import { schoolCollection } from '../collection'
import { mergeHeld } from '../merge-held'
import { dayKey, type DayRegister } from '../register-day'
import { SET } from '../ids'
import { readSnapshot } from '../snapshot'
import { serverNow } from '@/lib/server-clock'

/**
 * The daily register, on the class teacher's own device.
 *
 * This is the set the whole exercise is for. A teacher standing in front of
 * thirty children in a classroom with no signal has to be able to open the
 * register, mark it and have the marks survive — so the roll, the day and the
 * marks already filed all have to be here before the connection goes.
 */

/**
 * The arms this teacher is class teacher of.
 *
 * A 404 is this endpoint's way of saying "none" — a teacher who is nobody's
 * class teacher gets one rather than an empty list — so it is the answer, not
 * a failure, and is read as no arms. That is the single documented exception
 * to never resolving with `[]`: everything else still falls through to the
 * copy the device kept.
 */
export const registerArms = schoolCollection<MyClass, number>({
  id: SET.registerArms,
  fetch: () =>
    registerService.myClasses().catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return []
      throw error
    }),
  getKey: (arm) => arm.class_arm_id,
  schemaVersion: 1,
})

/**
 * The school's own words for a mark, and which of them mean the child was in
 * the building.
 *
 * One row, because that is what the endpoint answers with — a catalogue, not a
 * register. It is here rather than left on the query path because the whole
 * page turns on it: which words a teacher may tick, and whether late counts as
 * present, are the school's rules and not this app's, and a sheet drawn with
 * the wrong buttons is worse than no sheet. `statusOptions` still keeps its
 * written-down fallback for a device that has never once reached the school.
 */
export type StatusRow = StatusCatalogue & { id: string }

export const registerStatuses = schoolCollection<StatusRow, string>({
  id: SET.registerStatuses,
  fetch: () =>
    registerService.statuses().then((catalogue) => [{ ...catalogue, id: 'statuses' }]),
  getKey: (row) => row.id,
  schemaVersion: 1,
})

export type { DayRegister }

/**
 * How many days back the device keeps.
 *
 * Two: today, which is what a register is for, and yesterday, which is what a
 * teacher comes back to fix. It is a window rather than everything because
 * there is no endpoint that answers for a range — `attendances/register` is one
 * arm and one day — so each day here costs a request per arm, and a fortnight
 * of them would be a minute of somebody's data to open a page.
 *
 * A day outside the window is not lost, only not held: the page composes it
 * from the roll and says plainly that the marks already filed for it are not on
 * this device.
 */
export const DAYS_KEPT = 2

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

/** The window this set covers, newest first. */
export function daysKept(today: Date, span = DAYS_KEPT): string[] {
  return Array.from({ length: span }, (_, back) => {
    const day = new Date(today)
    day.setDate(day.getDate() - back)
    return isoDay(day)
  })
}

/**
 * Every arm's register for the days the device keeps.
 *
 * Whose arms they are is read off the copy the arms set already holds, and only
 * asked for when there is none — the same shape the guardian's register uses,
 * and for the same reason: `queryClient.query` inside a fetcher carries the
 * app's default network mode and would pause rather than fail, leaving this
 * collection in `loading` for as long as the device is offline.
 *
 * One refusing day keeps the copy the device already held — see the note on
 * the fetch — rather than taking the other days down with it, or worse, being
 * erased by its own refusal.
 */
export const registerDays = schoolCollection<DayRegister, string>({
  id: SET.registerDays,
  fetch: async () => {
    // The same 404-means-none reading as `registerArms` above; any other
    // failure throws, so the whole fetch falls through to the snapshot rather
    // than deciding this teacher has no arms and erasing the register with it.
    const arms =
      readSnapshot<MyClass>(SET.registerArms) ??
      (await registerService.myClasses().catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return [] as MyClass[]
        throw error
      }))

    // Today by the school's clock, not this device's. The anchor exists for
    // exactly the laptop that is ten minutes — or a day — out, and a window
    // drawn around the wrong "today" fetches registers for days the school
    // is not on.
    const wanted = arms.flatMap((arm) =>
      daysKept(new Date(serverNow())).map((date) => ({ armId: arm.class_arm_id, date })),
    )

    /*
     * A refusing day keeps the copy the device already held rather than being
     * dropped. What this fetch returns becomes the collection's whole state
     * *and* its snapshot, so dropping a failed day did not draw it as unknown
     * for a moment — it deleted the school's last answer for it, on the one
     * kind of connection (`navigator.onLine` true, requests dying) that gets
     * past the offline guard in `schoolCollection`. Only a day this device
     * never held is genuinely absent, and a day that rolled out of the window
     * is the one deletion done on purpose.
     */
    const held = new Map(
      (readSnapshot<DayRegister>(SET.registerDays) ?? []).map((day) => [day.id, day]),
    )

    const results = await Promise.all(
      wanted.map(async ({ armId, date }) => ({
        key: dayKey(armId, date),
        fresh: await registerService
          .register({ class_arm_id: armId, date })
          .then((register): DayRegister => ({ ...register, id: dayKey(armId, date) }))
          .catch(() => undefined),
      })),
    )

    return mergeHeld(results, held)
  },
  getKey: (day) => day.id,
  schemaVersion: 1,
})

export { dayKey }

/** Everything the register pages keep on the device. */
export const registerCollections = [registerArms, registerStatuses, registerDays]
