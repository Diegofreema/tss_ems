/**
 * The half of a dashboard greeting that depends on the clock.
 *
 * On the reader's own clock rather than the school's: this one greets the
 * person at the screen, and they are the only thing on a dashboard that is not
 * read off the API.
 */
export function greeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
