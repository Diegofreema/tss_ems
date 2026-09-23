/**
 * How long somebody waits before asking for another reset code.
 *
 * A code that has not arrived is the one moment a person presses a button
 * repeatedly — the email is slow, or in spam, and pressing again is the only
 * thing the screen offers. Each press mails another code and, because the API
 * issues a new one each time, **the code in the message they eventually open
 * may already have been replaced by the press that followed it**. So the wait
 * is not only politeness to the mail server: it stops a person invalidating
 * the code they are waiting for.
 *
 * Sixty seconds, and it is stated once here rather than in the two screens
 * that honour it.
 */
export const RESEND_SECONDS = 60

/** The last code this device asked for: the address, and when. */
export type CodeSent = { to: string | null; at: number | null }

/** Case and stray spaces are the person's typing, not a different account. */
function sameAddress(one: string | null, other: string): boolean {
  return (one ?? '').trim().toLowerCase() === other.trim().toLowerCase()
}

/**
 * Seconds still to wait before `email` may be sent another code, and 0 when it
 * may be sent one now.
 *
 * **Scoped to the address.** A person who mistyped their email and wants to
 * try another must not be held for a minute over a code that went nowhere near
 * them — the wait exists to stop repeat sends to one inbox, and a different
 * address is a different request. The resend button on the code screen is
 * always the same address, so it always waits.
 */
export function waitLeft(sent: CodeSent, email: string, now: number): number {
  if (sent.at === null || !sameAddress(sent.to, email)) return 0
  const gone = Math.floor((now - sent.at) / 1000)
  // A clock that moved backwards under us — a laptop correcting itself, a
  // manual change — would otherwise lock the screen for however far it moved.
  if (gone < 0) return 0
  return Math.max(0, RESEND_SECONDS - gone)
}

/** What the resend button says while it waits, and when it is ready again. */
export function resendLabel(left: number, sending = false): string {
  if (sending) return 'Sending…'
  return left > 0 ? `Send it again in ${left}s` : 'Send it again'
}
