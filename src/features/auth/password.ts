export type PasswordRule = {
  label: string
  passed: boolean
}

/**
 * The shortest password the school will take, and the only place the figure is
 * written. It is the same six the sign-in field has always accepted — a bar
 * the reset screen may not set higher than the door it lets people back
 * through, or an account locked out of its own portal would be asked for a
 * password it could then never sign in with.
 */
export const MINIMUM_LENGTH = 6

/** The four things the school checks, shown as a live checklist. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    {
      // Written from the constant rather than spelled out, so the checklist
      // cannot go on promising a bar the validator has stopped holding.
      label: `At least ${MINIMUM_LENGTH} characters`,
      passed: password.length >= MINIMUM_LENGTH,
    },
    {
      label: 'Upper and lower case',
      passed: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { label: 'At least one number', passed: /[0-9]/.test(password) },
    { label: 'At least one symbol', passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

/**
 * 0–4. Anything under `MINIMUM_LENGTH` is capped at 1 however many other rules
 * it passes, so length can never be traded away.
 */
export function passwordScore(password: string): number {
  const passed = passwordRules(password).filter((rule) => rule.passed).length
  return password.length < MINIMUM_LENGTH ? Math.min(passed, 1) : passed
}

/** The school accepts a password from a score of 3. */
export const MINIMUM_SCORE = 3

const STRENGTH_WORDS = [
  'Too short to accept',
  'Weak — add a number or a symbol',
  'Nearly there — add a symbol',
  'Strong enough',
  'Strong',
]

export function strengthLabel(password: string): string {
  if (!password) return 'Nothing typed yet'
  return STRENGTH_WORDS[passwordScore(password)]
}
