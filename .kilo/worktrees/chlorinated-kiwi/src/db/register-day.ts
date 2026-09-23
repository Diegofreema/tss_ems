import type { Register } from '../api/attendance/types.ts'

/**
 * One arm's register on one day, keyed so a device can hold several of both.
 *
 * Its own leaf module rather than a type on the collection, because the pure
 * logic that composes a day's sheet has to name this shape and is tested under
 * `node --test`, which resolves relative paths with extensions and knows
 * nothing about `@/`. Importing it from the collection would drag every
 * service in the app into that test program.
 */
export type DayRegister = Register & {
  /** `<class_arm_id>:<YYYY-MM-DD>`. */
  id: string
}

/** How a day's register is keyed, for the page that looks one up. */
export const dayKey = (armId: number, date: string) => `${armId}:${date}`
