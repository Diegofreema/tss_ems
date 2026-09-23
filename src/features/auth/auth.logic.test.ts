import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MINIMUM_LENGTH,
  MINIMUM_SCORE,
  passwordScore,
  strengthLabel,
} from './password.ts'
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
  // Upper+lower, a number and a symbol, but a character short of the bar.
  assert.equal(passwordScore('Ab1!e'), 1)
  assert.ok(passwordScore('Ab1!ef') >= MINIMUM_SCORE)
})

test('the shortest password the school takes is the one it signs in with', () => {
  // Six, because that is what the sign-in field has always accepted. A reset
  // screen asking for more would lock an account out of its own portal.
  assert.equal(MINIMUM_LENGTH, 6)
  // Three of the four rules is the bar, and six plain characters reach it
  // without a symbol — which is the whole point of lowering the length.
  assert.ok(passwordScore('Abc123') >= MINIMUM_SCORE)
  assert.ok(passwordScore('Abc12') < MINIMUM_SCORE)
})

test('strength wording tracks the score', () => {
  assert.equal(strengthLabel(''), 'Nothing typed yet')
  // Five characters and one rule passed of the other three: capped at 0.
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
