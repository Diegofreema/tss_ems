import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isSuperAdmin,
  isSuperAdminRole,
  namesSomebodyElse,
  roleForAccount,
  usingDefaultPassword,
} from './role.ts'
import type { Account } from '../../api/auth/types.ts'

const account = (role: { id: number; role_name: string } | null) =>
  ({ user: { fname: 'Ada', lname: 'Obi', username: 'ada' }, role }) as never

test('the super administrator is told apart from the rest of the office', () => {
  assert.ok(isSuperAdmin(account({ id: 5, role_name: 'Super Admin' })))
  // Renamed on the school's own server, but still the system role.
  assert.ok(isSuperAdmin(account({ id: 5, role_name: 'Principal' })))
  // Named for it under another id, which is how a school adds a second one.
  assert.ok(isSuperAdmin(account({ id: 12, role_name: 'super admin' })))
})

test('everyone else in the office is not one', () => {
  assert.ok(!isSuperAdmin(account({ id: 7, role_name: 'Bursar' })))
  assert.ok(!isSuperAdmin(account({ id: 1, role_name: 'Admin' })))
  assert.ok(!isSuperAdmin(account({ id: 6, role_name: 'Secretary' })))
  // No role on the account at all, and no account: neither is a yes.
  assert.ok(!isSuperAdmin(account(null)))
  assert.ok(!isSuperAdmin(null))
})

test('a role read off a record answers the same as one off the session', () => {
  // The register carries the role by name and nothing else, which is all the
  // record page has to go on when it decides whether to offer the flow.
  assert.ok(isSuperAdminRole('Super Admin'))
  assert.ok(isSuperAdminRole('super admin'))
  assert.ok(!isSuperAdminRole('Bursar'))
  // The register's own fallback when the roles feed failed: not a claim that
  // this account is a super administrator.
  assert.ok(!isSuperAdminRole('Administrator'))
  assert.ok(!isSuperAdminRole(undefined))
})

/** As POST /users/login answers for a guardian on bronze. */
const PARENT = {
  user: { id: 478, username: 'parent1@netpro.com', fname: 'Udoye', lname: 'Okagbue' },
  role: { id: 4, role_name: 'Rector' },
  profile_type: 'parent',
} as unknown as Account

/** As GET /users/me answers for everybody on bronze, token or none. */
const SUPER_ADMIN = {
  user: { id: 1, username: 'chukwudi.aniegboka@netpro.africa', fname: 'Chukwudi' },
  role: { id: 5, role_name: 'Super Admin' },
  profile_type: 'admin',
} as unknown as Account

test('a guardian is a parent however their role has been named', () => {
  // The role on this account reads "Rector"; the profile type is the truth,
  // and "rector" contains none of the four words the fallback looks for.
  assert.equal(roleForAccount(PARENT), 'Parent')
  assert.equal(roleForAccount({ ...PARENT, profile_type: 'sparent' } as Account), 'Parent')
})

test('a me naming a different person is a device that has lost track of who is using it', () => {
  // Two tabs on a staff-room laptop, two people. The cached identity is the
  // one that is wrong here: `me` answers for the token every request carries.
  assert.equal(namesSomebodyElse(PARENT, SUPER_ADMIN), true)
})

test('a me for the same person is not a mismatch, however the role is renamed', () => {
  const renamed = { ...PARENT, role: { id: 4, role_name: 'Guardian' } } as Account
  assert.equal(namesSomebodyElse(PARENT, renamed), false)
})

test('with nobody cached there is nothing to disagree with', () => {
  assert.equal(namesSomebodyElse(null, SUPER_ADMIN), false)
})

/** As bronze answers it: the word, not the boolean. */
const withFlag = (isdefaultpassword: unknown) =>
  ({ user: { id: 1, fname: 'Chukwudi', isdefaultpassword } }) as unknown as Account

test('the default-password flag is read as a word, not for truthiness', () => {
  assert.ok(usingDefaultPassword(withFlag('true')))
  assert.ok(usingDefaultPassword(withFlag('True')))
  assert.ok(usingDefaultPassword(withFlag(true)))
  // The half of it that `Boolean(flag)` gets wrong, and the reason this is a
  // function at all: "false" is a non-empty string, so a truthiness test would
  // put the change-your-password gate in front of every account on the school.
  assert.ok(!usingDefaultPassword(withFlag('false')))
  assert.ok(!usingDefaultPassword(withFlag(false)))
  assert.ok(!usingDefaultPassword(withFlag('')))
})

test('a school that was never asked the question is not shut out of its portal', () => {
  // A deployment older than the field sends no flag at all, and neither does
  // an account read off a device that cached one before the field existed.
  assert.ok(!usingDefaultPassword(withFlag(undefined)))
  assert.ok(!usingDefaultPassword(withFlag(null)))
  assert.ok(!usingDefaultPassword({ user: {} } as unknown as Account))
  assert.ok(!usingDefaultPassword(null))
  assert.ok(!usingDefaultPassword(undefined))
})
