export type PasswordRule = {
  label: string
  passed: boolean
}

/** The four things the school checks, shown as a live checklist. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    { label: 'Ten characters or more', passed: password.length >= 10 },
    {
      label: 'Upper and lower case',
      passed: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    { label: 'At least one number', passed: /[0-9]/.test(password) },
    { label: 'At least one symbol', passed: /[^A-Za-z0-9]/.test(password) },
  ]
}

/**
 * 0–4. Anything under ten characters is capped at 1 however many other rules
 * it passes, so length can never be traded away.
 */
export function passwordScore(password: string): number {
  const passed = passwordRules(password).filter((rule) => rule.passed).length
  return password.length < 10 ? Math.min(passed, 1) : passed
}

/** The school accepts a password from a score of 3. */
export const MINIMUM_SCORE = 3

const STRENGTH_WORDS = [
  'Too short to accept',
  'Weak — add length and a number',
  'Nearly there — add a symbol',
  'Strong enough',
  'Strong',
]

export function strengthLabel(password: string): string {
  if (!password) return 'Nothing typed yet'
  return STRENGTH_WORDS[passwordScore(password)]
}
