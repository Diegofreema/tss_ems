/**
 * A field the school sends either as a name or as the whole record it names.
 *
 * `class_arm` is typed as a string across the timetable endpoints and arrives
 * on this deployment as an object. That is not a wrong answer on screen — a
 * `.trim()` on a record is a TypeError, and it took the student's timetable page
 * down to its error boundary and would have done the same to the guardian's.
 *
 * Shared because both portals read the same field off the same endpoints, and
 * read defensively for the same reason the batch rows and the invoice rows
 * already do: the shape of a field nobody has pinned down is not something to
 * bet a page on.
 */
export function nameOf(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    for (const key of ['arm_name', 'name', 'title']) {
      const named = (value as Record<string, unknown>)[key]
      if (typeof named === 'string' && named.trim()) return named.trim()
    }
  }
  return ''
}
