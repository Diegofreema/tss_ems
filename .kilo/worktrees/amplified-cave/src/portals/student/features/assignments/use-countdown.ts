import { useEffect, useMemo, useState } from 'react'
import { serverNow } from '@/lib/server-clock'
import { remainingSeconds, secondsLeft } from './clock'

/** A clock that only ever goes forwards, and at the rate a clock goes. */
function monotonicNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

/**
 * How long is left on an assignment's deadline, re-read once a second.
 *
 * A deadline rather than a counter. Subtracting a second per tick sounds like
 * the same thing and is not: a background tab has its timers throttled and a
 * sleeping phone stops them altogether, so the old counter handed a student
 * every minute they spent somewhere else. Time now passes while they are away,
 * which is what "time allowed" means.
 *
 * Two clocks are read and the smaller answer wins:
 *
 * - how much of the sitting is left by `performance.now()`, which counts real
 *   elapsed time and cannot be moved;
 * - how much is left by the deadline against the school's clock, which is
 *   re-anchored on every API response and so takes account of the page having
 *   been shut for an hour.
 *
 * Taking the smaller means neither can put time back on: winding the device
 * clock backwards leaves the monotonic reading in charge, and it keeps counting
 * down as if nothing had happened.
 */
export function useCountdown(deadline: number | null) {
  // Where the sitting was picked up and how much was left at that moment. A
  // different deadline is a different sitting, so it takes its own anchor —
  // computed during render rather than assigned from an effect, which would
  // leave one paint reading against the previous sitting's start.
  const sitting = useMemo(
    () => ({ mark: monotonicNow(), from: remainingSeconds(deadline, serverNow()) * 1000 }),
    [deadline],
  )
  const [seconds, setSeconds] = useState(() => secondsLeft(sitting.from))

  useEffect(() => {
    const read = () => {
      const bySitting = sitting.from - (monotonicNow() - sitting.mark)
      const byClock = deadline === null ? 0 : deadline - serverNow()
      setSeconds(secondsLeft(Math.min(bySitting, byClock)))
    }

    const timer = setInterval(read, 1000)
    // A throttled tab may not have ticked for minutes, and coming back to it is
    // exactly when the reading is looked at — so it is caught up first.
    document.addEventListener('visibilitychange', read)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', read)
    }
  }, [deadline, sitting])

  return { seconds }
}
