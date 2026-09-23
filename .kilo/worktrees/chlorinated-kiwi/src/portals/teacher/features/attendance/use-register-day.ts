import { useLiveQuery } from '@tanstack/react-db'
import type { MyClass } from '@/api/attendance/types'
import type { TeacherStudent } from '@/api/teaching/types'
import {
  registerArms,
  registerDays,
  registerStatuses,
  type StatusRow,
} from '@/db/collections/attendance'
import { teacherRoll } from '@/db/collections/teaching'
import type { OutboxOp } from '@/db/outbox'
import { dayKey, type DayRegister } from '@/db/register-day'
import { outbox } from '@/db/store'
import { toApiDate } from '@/features/collections/date-range'
import { composeDay, queuedMarks, type ComposedDay } from './day'
import { myClassOptions, statusOptions, type ClassOption, type StatusOption } from './register'

/**
 * The register, read off the device.
 *
 * Nothing here asks the school anything. The arms, the roll, the day's marks
 * and the words a mark may take are all sets the portal has already synced, and
 * on top of them sit the marks this teacher has made that the school has not
 * heard yet. That is what makes the page work in a classroom with no signal —
 * and it is why none of these can be a query: a paused request never settles,
 * and a register that never settles is a teacher standing in front of a
 * skeleton.
 */

/** A set has answered one way or the other and the page can draw. */
const settled = (state: { isReady: boolean; isError: boolean }) =>
  state.isReady || state.isError

export type RegisterArms = {
  arms: ClassOption[]
  armId: number
  pending: boolean
  /** This teacher is class teacher of no arm — the endpoint's own 404. */
  none: boolean
  /** Never synced on this device, and no connection to sync it now. */
  unknown: boolean
}

/**
 * The arms this teacher is class teacher of.
 *
 * Both attendance pages are asked one arm at a time and both are closed to a
 * subject teacher, so both read the same set and fall back to the same first
 * arm when the URL names none.
 */
export function useRegisterArms(selected: string): RegisterArms {
  const held = useLiveQuery({ query: (q) => q.from({ arm: registerArms }) })
  const arms = myClassOptions(held.data as MyClass[] | undefined)

  return {
    arms,
    armId: Number(selected) || arms[0]?.id || 0,
    pending: !settled(held),
    none: held.isReady && arms.length === 0,
    unknown: held.isError,
  }
}

/**
 * The school's own words for a mark, or the written-down four.
 *
 * The note comes back with them: it is the school explaining what late and
 * excused mean, in its own words rather than this page's paraphrase.
 */
export function useMarkWords(): { options: StatusOption[]; note?: string } {
  const held = useLiveQuery({ query: (q) => q.from({ row: registerStatuses }) })
  const catalogue = (held.data as StatusRow[] | undefined)?.[0]
  return { options: statusOptions(catalogue), note: catalogue?.note }
}

export type RegisterDay = ComposedDay & {
  /** The day being marked: the one in the URL, or today. */
  date: string
  /** The sets have not answered yet, so there is nothing to draw. */
  pending: boolean
}

/**
 * One arm's sheet for one day, with everything this device knows on it.
 *
 * The date is resolved here rather than left to the endpoint. Online the server
 * fills in today for a missing date; with no connection there is nobody to ask,
 * and a sheet has to know which day it is before it can be filed.
 */
export function useRegisterDay(armId: number, date: string): RegisterDay {
  const wanted = date || toApiDate(new Date()) || ''
  const days = useLiveQuery({ query: (q) => q.from({ day: registerDays }) })
  const roll = useLiveQuery({ query: (q) => q.from({ student: teacherRoll }) })
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })

  const held = (days.data as DayRegister[] | undefined)?.find(
    (one) => one.id === dayKey(armId, wanted),
  )
  const queued = queuedMarks((queue.data ?? []) as OutboxOp[], armId, wanted)

  return {
    date: wanted,
    pending: !settled(days) || !settled(roll),
    ...composeDay(held, (roll.data ?? []) as TeacherStudent[], armId, queued),
  }
}
