/**
 * Newest first, by id.
 *
 * By id rather than by date because this API stamps a batch of rows with one
 * second: a term's bills are raised in a single go, and a class's marks are
 * filed in a single upload. Sorted by their timestamps they come back in
 * whatever order the database felt like; sorted by id they come back in the
 * order the school made them.
 */
export function newestFirst<T extends { id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.id) - Number(a.id))
}
