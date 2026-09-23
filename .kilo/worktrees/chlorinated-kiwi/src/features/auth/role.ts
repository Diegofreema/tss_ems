// Relative and extensioned, like the rest of what the node test runner reads.
import type { Account } from '../../api/auth/types.ts'

export type Role = 'Admin' | 'Teacher' | 'Student' | 'Parent'

export type Portal = {
  role: Role
  label: string
  hint: string
  to: string
}

export const PORTALS: Portal[] = [
  { role: 'Admin', label: 'Admin portal', hint: 'Office and bursary', to: '/admin' },
  { role: 'Teacher', label: 'Teacher portal', hint: 'Scores and registers', to: '/teacher' },
  { role: 'Student', label: 'Student portal', hint: 'Results and materials', to: '/student' },
  { role: 'Parent', label: 'Parent portal', hint: 'Fees and progress', to: '/parent' },
]

/** `profile_type` as the API spells it, against the portal it opens. */
const PROFILE_ROLES: Record<string, Role> = {
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  // The API calls a guardian record an sparent; a school calls it a parent.
  sparent: 'Parent',
  parent: 'Parent',
}

/** The wording fallback, matched loosely — "Super Admin" is an admin. */
const NAMED_ROLES: [string, Role][] = [
  ['admin', 'Admin'],
  ['teacher', 'Teacher'],
  ['student', 'Student'],
  ['parent', 'Parent'],
]

/**
 * The account decides the portal, not the person signing in.
 *
 * `profile_type` is the answer whenever the API gives one: it names which kind
 * of record the login owns, from a fixed set. `role_name` is only consulted
 * behind it, because a school can rename its roles and the API is happy to
 * call an administrator a "Super Admin".
 *
 * `null` means no portal — the account exists but belongs to none of the four.
 */
export function roleForAccount(account: Account): Role | null {
  const profileType = account.profile_type?.toLowerCase()
  if (profileType && PROFILE_ROLES[profileType]) return PROFILE_ROLES[profileType]

  const name = account.role?.role_name?.toLowerCase() ?? ''
  return NAMED_ROLES.find(([spelling]) => name.includes(spelling))?.[1] ?? null
}

/**
 * Whether the office has switched this sign-in off. The record, the trail and
 * the privileges all stay; only the access stops, which is what the staff
 * register's "Disable sign-in" does.
 */
export function isDisabled(account: Account | null): boolean {
  return account?.user.userstatus === 'Disabled'
}

/**
 * Whether this account is still signing in with the password the office gave
 * it — `isdefaultpassword` on `/users/me` and on the login answer alike.
 *
 * Read strictly rather than for truthiness, because the API sends the *word*:
 * `"true"` and `"false"` are both non-empty strings, so `Boolean(flag)` would
 * lock out every account on the deployment. A deployment that does not send
 * the field at all is a no — a portal must never be shut on a question the
 * school was never asked.
 */
export function usingDefaultPassword(account: Account | null | undefined): boolean {
  const flag = account?.user?.isdefaultpassword
  if (typeof flag === 'boolean') return flag
  return typeof flag === 'string' && flag.trim().toLowerCase() === 'true'
}

/** What a person turned away for it is told, on the form they land on. */
export const DISABLED_TITLE = 'This account has been disabled'
export const DISABLED_BODY = 'Ask the school office to turn it back on.'

/**
 * Whether `/users/me` is describing somebody other than the account this
 * device thinks is signed in.
 *
 * It should never be true. `me` answers for the token, and the token was
 * minted by the login that stored the account — so a different `user.id` means
 * the two have come apart, and on a shared machine there is a way for that to
 * happen: two tabs, two people, one browser. The cached identity was kept
 * where every tab could read it while the token was kept in the tab that
 * earned it, so a reload could pick up somebody else's identity and open their
 * portal with it.
 *
 * `me` is the truth of the two — it is the token's own answer, and the token
 * is what every request carries. Nothing here decides what to *do* about a
 * mismatch; `loadAccount` ends the session, because a device that cannot say
 * who is using it has to ask again.
 *
 * This replaced `accountOfRecord`, which believed the login over `me` for the
 * opposite reason: bronze used to ignore the Authorization header on this one
 * endpoint and hand the school's Super Admin to every caller. That was fixed
 * on 2026-09-01 — re-checked 2026-09-11, when a student token answered the
 * student and a made-up one answered 401 — so keeping the old guard only meant
 * discarding the one signal that would have corrected a stale identity.
 */
export function namesSomebodyElse(
  signedInAs: Account | null,
  fresh: Account,
): boolean {
  if (!signedInAs) return false
  return signedInAs.user?.id !== fresh.user?.id
}

export function portalFor(role: Role): Portal {
  return PORTALS.find((portal) => portal.role === role) ?? PORTALS[1]
}

/**
 * The school's own super-administrator role. Its id is fixed on the server —
 * bronze lists Admin 1, Super Admin 5, Bursar 7 — but a school may rename it,
 * so the name is read first and the id answers when the name has been changed
 * to something else.
 */
const SUPER_ADMIN_ROLE_ID = 5

/**
 * Whether this account may act on other administrators: granting and taking
 * away privileges, and deleting an office record. The API enforces it either
 * way; this is so the portal stops offering what it knows will be refused.
 */
export function isSuperAdmin(account: Account | null | undefined): boolean {
  const role = account?.role
  return role ? isSuperAdminRole(role.role_name, role.id) : false
}

/**
 * The same question of a role read off a record rather than off the session —
 * the register carries the account's role by name, and that is all a row has
 * to say who it belongs to.
 */
export function isSuperAdminRole(
  name: string | null | undefined,
  id?: number | null,
): boolean {
  return /super\s*admin/i.test(name ?? '') || id === SUPER_ADMIN_ROLE_ID
}
