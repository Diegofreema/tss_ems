import { useEffect, useState } from 'react'

/** How long a search box waits after the last keystroke before asking. */
const SETTLE_MS = 300

/**
 * The value as it was a moment ago, so a search costs one request rather than
 * one per keystroke. The box itself stays on the live value — only what gets
 * asked for lags behind it.
 */
export function useDebounced<TValue>(value: TValue, delay = SETTLE_MS): TValue {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
