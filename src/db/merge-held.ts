/**
 * What a fan-out fetch settles to when only some of its requests answered.
 *
 * A fetcher's return value is the complete state of its collection, and it is
 * also written over the snapshot — so a fan-out that quietly drops the slices
 * that failed does not merely draw less, it *erases the device's copy* of
 * exactly the rows it could not refresh. This is the rule at the top of
 * CLAUDE.md ("never resolve with `[]` or a partial page on failure") applied
 * to the fetchers that make one request per arm, per day or per child.
 *
 * So the answer is composed: the school's fresh slice where it answered, the
 * device's held slice where it did not, and nothing only where neither has
 * one — which is a slice this device genuinely never saw, and the page already
 * says so. A held slice whose key is no longer wanted (a day that rolled out
 * of the window) is dropped, which is the one deletion that is deliberate.
 *
 * Its own leaf module with no imports, so the logic every register's survival
 * depends on is tested under `node --test` without dragging a service in.
 */
export function mergeHeld<K, T>(
  /** One entry per slice the fetch wanted, in the order it wants them kept. */
  results: readonly { key: K; fresh: T | undefined }[],
  /** The device's previous answer, keyed the same way. */
  held: ReadonlyMap<K, T>,
): T[] {
  const out: T[] = []
  for (const { key, fresh } of results) {
    const chosen = fresh ?? held.get(key)
    if (chosen !== undefined) out.push(chosen)
  }
  return out
}
