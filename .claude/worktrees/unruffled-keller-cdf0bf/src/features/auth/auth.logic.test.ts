import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MINIMUM_SCORE, passwordScore, strengthLabel } from './password.ts'
import { isDisabled, roleForAccount } from './role.ts'

/** Only the parts of a sign-in the portal decision reads. */
const account = (record: Record<string, unknown>) =>
  ({ user: { username: 'x' }, ...record }) as never

test('profile_type decides the portal', () => {
  assert.equal(roleForAccount(account({ profile_type: 'admin' })), 'Admin')
  assert.equal(roleForAccount(account({ profile_type: 'teacher' })), 'Teacher')
  assert.equal(roleForAccount(account({ profile_type: 'student' })), 'Student')
  assert.equal(roleForAccount(account({ profile_type: 'sparent' })), 'Parent')
})

test('profile_type outranks a role name the school has changed', () => {
  // The live payload: profile_type "admin" under the role name "Super Admin".
  assert.equal(
    roleForAccount(
      account({ profile_type: 'admin', role: { id: 5, role_name: 'Super Admin' } }),
    ),
    'Admin',
  )
})

test('an account with no profile_type falls back to its role name', () => {
  const named = (role_name: string) =>
    roleForAccount(account({ role: { id: 1, role_name } }))

  assert.equal(named('Super Admin'), 'Admin')
  assert.equal(named('Parent'), 'Parent')
  // Nothing to read either way means there is no portal to open.
  assert.equal(named('Bursary'), null)
  assert.equal(roleForAccount(account({})), null)
})

test('length can never be traded away for other rules', () => {
  // Upper+lower, a number and a symbol, but only nine characters.
  assert.equal(passwordScore('Ab1!efghi'), 1)
  assert.ok(passwordScore('Ab1!efghij') >= MINIMUM_SCORE)
})

test('strength wording tracks the score', () => {
  assert.equal(strengthLabel(''), 'Nothing typed yet')
  assert.equal(strengthLabel('short'), 'Too short to accept')
  assert.equal(strengthLabel('Abcdefghij1!'), 'Strong')
})

test('a sign-in the office has switched off is refused', () => {
  const status = (userstatus: string | null) =>
    isDisabled({ user: { username: 'x', userstatus } } as never)

  // The API spells these two exactly; anything else is not a disabling.
  assert.equal(status('Disabled'), true)
  assert.equal(status('Enabled'), false)
  assert.equal(status(null), false)
  assert.equal(isDisabled(null), false)
})
