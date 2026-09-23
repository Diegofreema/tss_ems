import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountOfRecord, isSuperAdmin, isSuperAdminRole, roleForAccount } from './role.ts'
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

test('a me that names somebody else is not believed over the sign-in', () => {
  // Bronze hands the school's Super Admin to every caller. Adopting it puts a
  // parent who has just signed in into the admin portal.
  assert.equal(accountOfRecord(PARENT, SUPER_ADMIN), PARENT)
  assert.equal(roleForAccount(accountOfRecord(PARENT, SUPER_ADMIN)), 'Parent')
})

test('a me for the same person is believed, and is the fresher record', () => {
  const renamed = { ...PARENT, role: { id: 4, role_name: 'Guardian' } } as Account
  assert.equal(accountOfRecord(PARENT, renamed), renamed)
})

test('with nobody signed in there is nothing to check against', () => {
  assert.equal(accountOfRecord(null, SUPER_ADMIN), SUPER_ADMIN)
})
