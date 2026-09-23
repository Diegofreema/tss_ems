import type { SavedRegister } from './types.ts'

/**
 * What the endpoint filed and what it threw away.
 *
 * A student id from another class is ignored and named rather than filed
 * against a class they are not in — so it is worth repeating on screen, since
 * the teacher will otherwise count the saved rows and find one short.
 *
 * Beside the response shape rather than on the page, because the page no longer
 * sees the response: a register is queued now, and the school's answer comes
 * back to the drain, hours later and somewhere else entirely.
 */
export function ignoredNote(saved: SavedRegister | undefined): string {
  const ignored = saved?.ignored ?? []
  if (ignored.length === 0) return ''
  return `${ignored.length} student ${ignored.length === 1 ? 'id was' : 'ids were'} not in this class and ${ignored.length === 1 ? 'was' : 'were'} not filed: ${ignored.join(', ')}.`
}
