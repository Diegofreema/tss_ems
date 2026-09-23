/** Below this the clock turns accent — the design's warning threshold. */
export const WARNING_SECONDS = 300

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export function isRunningOut(seconds: number): boolean {
  return seconds < WARNING_SECONDS
}

/**
 * A span in ms as the whole seconds a clock should show.
 *
 * Rounded up, so it reads 0:00 at the deadline itself rather than for the whole
 * of the last second before it, and never below zero.
 */
export function secondsLeft(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000))
}

/**
 * How long is left on a deadline, in whole seconds. An assignment that never
 * set one has nothing left to run.
 */
export function remainingSeconds(deadline: number | null, now: number): number {
  return deadline === null ? 0 : secondsLeft(deadline - now)
}
