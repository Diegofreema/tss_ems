/**
 * The sign-in the school just made for a household.
 *
 * `POST /sparents` answers with the username and the first password, and
 * nothing else ever will — there is no endpoint that reads a password back or
 * re-issues one. So it has to be put in front of the office and left there.
 *
 * Beside the response shape rather than on the page, because the page no longer
 * sees the response: a household is queued now, and the school's answer comes
 * back to the drain — which may be hours later, and is exactly why the note it
 * raises does not clear itself.
 */
export function loginNote(created: unknown): string | undefined {
  const made = created as { username?: unknown; password?: unknown } | null
  const username = typeof made?.username === 'string' ? made.username.trim() : ''
  const password = typeof made?.password === 'string' ? made.password.trim() : ''
  if (!username || !password) return undefined

  return `Give the household these sign-in details: ${username} — first password ${password}. Shown once. If it is lost, the guardian resets it from the sign-in page.`
}
