import type { Account } from '../../api/auth/types.ts'
import type { Admin } from '../../api/users/types.ts'
import { accountSummary } from '../auth/account-summary.ts'
import type { ProfileConfig } from './types.ts'

/**
 * The field keys the signed-in account actually carries. Every other key on a
 * portal's config — a staff number, a class, an admission number — is held by
 * the school office and has no home in `/users/me` yet, so it is left as the
 * portal defined it.
 */
function ownedValues(account: Account): Record<string, string> {
  const { user } = account

  return {
    fullname: accountSummary(account).name,
    // Empty rather than the portal's placeholder: a blank field is honest
    // about the school holding no number, a borrowed one is not.
    phone: user.phone ?? '',
    address: user.address ?? '',
    role: account.role?.role_name ?? '',
  }
}

/**
 * The office and the role name, for the line under the person's name.
 *
 * The role name here rather than the profile type the sidebar shows: this is
 * the page where an administrator's own record is read, and `role_name` is the
 * only thing that tells a Super Admin from an ordinary one.
 */
function metaFor(account: Account): string {
  const department =
    account.profile_type === 'admin'
      ? (account.profile as Admin | undefined)?.department?.name
      : undefined

  return [account.role?.role_name, department].filter(Boolean).join(' · ')
}

/**
 * Whether this person can change their own record. `PATCH /users/profile` is
 * the administrator's own; teachers, pupils and guardians have no endpoint for
 * theirs, so the school office is the only route to a correction.
 */
export function ownsProfile(account: Account | null): boolean {
  return account?.profile_type === 'admin'
}

/**
 * The portal's profile page, rewritten around the person actually signed in.
 * What the account does not answer for is left as the portal wrote it, so the
 * page keeps its shape whichever role is looking at it.
 */
export function profileFromAccount(config: ProfileConfig, account: Account): ProfileConfig {
  const summary = accountSummary(account)
  const owned = ownedValues(account)
  const values = Object.fromEntries(
    Object.entries(config.values).map(([key, value]) => [key, owned[key] ?? value]),
  )

  return {
    ...config,
    initials: summary.initials,
    meta: metaFor(account),
    // Nothing to type into where nothing can be saved: the whole record is
    // shown the way the office-held fields already are.
    fields: ownsProfile(account)
      ? config.fields
      : config.fields.map((field) => ({ ...field, locked: true as const })),
    values,
    account: config.account.map((row) =>
      // The one row every portal spells the same, and the only one the
      // account answers — the rest are sign-in history the API does not send.
      row.label === 'Signs in with' ? { ...row, value: account.user.username } : row,
    ),
  }
}
