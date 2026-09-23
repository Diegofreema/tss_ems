import { useEffect, useState } from 'react'
import { useAuthStore } from './auth.store'
import { waitLeft } from './resend'

/**
 * Seconds still to wait before another reset code may be asked for, ticking
 * down to zero.
 *
 * Read off the store rather than held per screen, so the wait follows the
 * person rather than the page: asking for a code on the first screen and
 * walking straight into the second finds the countdown already running, and
 * walking back out of it does not hand them a fresh button. A timer owned by
 * one screen would be a timer the other screen does not know about, which is
 * the same as no timer at all.
 *
 * Not persisted, deliberately. The recovery flow is in memory — a reload drops
 * the address and the user id with it and the person starts again — so a wait
 * that outlived the flow would be a wait attached to nothing.
 */
export function useResendWait(email: string): number {
  const sentTo = useAuthStore((state) => state.codeSentTo)
  const sentAt = useAuthStore((state) => state.codeSentAt)
  const [, tick] = useState(0)

  /*
   * Worked out at render from the clock, not kept in state. A stored `now`
   * would be read on the first render after a new code is sent and be as old
   * as the mount — minutes stale on a screen somebody left open — and it would
   * say the wait was over before the interval had run once. The interval only
   * asks for a re-render; this line is what answers.
   *
   * The device's own clock on both sides of the subtraction, never
   * `serverNow()`: the store wrote `codeSentAt` from this clock, and the
   * school's offset is re-anchored by every response — mixing the two would
   * put that correction straight into an elapsed time and jump the countdown
   * mid-wait. (`new Date()` rather than `Date.now()` is how the rest of the
   * app reads the clock at render, and it is the spelling the linter's purity
   * rule accepts.)
   */
  const left = waitLeft({ to: sentTo, at: sentAt }, email, new Date().getTime())

  useEffect(() => {
    if (sentAt === null) return
    /*
     * Four times a second rather than once: on a one-second tick the displayed
     * figure can sit on the same number for nearly two seconds and then drop
     * two, which reads as a stuck timer.
     */
    const id = setInterval(() => {
      tick((count) => count + 1)
      if (waitLeft({ to: sentTo, at: sentAt }, email, Date.now()) === 0) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [sentTo, sentAt, email])

  return left
}
