/**
 * How a register bound to a collection orders itself.
 *
 * It has to: a register read off the device is read out of a keyed collection,
 * which hands its rows back in key order however the endpoint sent them.
 * Whatever order a list arrived in is gone by the time it is drawn, so every
 * binding states its own — and the ones whose footers promise "Newest first"
 * say it here rather than hoping.
 *
 * Shared rather than per portal, because the problem is the collection's and
 * not any one portal's: the teacher's e-classes and mark register and the
 * student's borrowing record all lost the same order for the same reason.
 */

/** When a row carries no usable stamp, so it sorts behind every row that does. */
const UNSTAMPED = Number.NEGATIVE_INFINITY

function at(stamp: string | null | undefined): number {
  if (!stamp?.trim()) return UNSTAMPED
  const parsed = new Date(stamp).getTime()
  return Number.isNaN(parsed) ? UNSTAMPED : parsed
}

/**
 * Oldest first, by the id the school issued.
 *
 * The order a register was written in, which for a roll, a subject list and a
 * record of topics covered is the order it reads best in and the order the
 * endpoints send. Stated rather than inherited.
 */
export function byId<T extends { id: number }>(rows: readonly T[]): T[] {
  return [...rows].sort((one, two) => one.id - two.id)
}

/**
 * Newest first, by the stamp the row carries, falling back to the id.
 *
 * A total order rather than two half-orders: rows with no stamp sort behind
 * every row that has one and among themselves by id, newest first. That
 * matters here because the mark register's three stamps are null across this
 * whole deployment — the id is the only thing that knows which mark was filed
 * last, and it is monotonic with filing.
 */
export function newestFirst<T extends { id: number }>(
  rows: readonly T[],
  stamp: (row: T) => string | null | undefined,
): T[] {
  return [...rows].sort((one, two) => at(stamp(two)) - at(stamp(one)) || two.id - one.id)
}
