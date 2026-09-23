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
