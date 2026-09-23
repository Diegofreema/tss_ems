import type { Account, ProfileType } from '../../api/auth/types.ts'
import { pick } from '../collections/loose.ts'
import type { AccountSummary } from '../../lib/account.ts'
import { capitalise } from '../../lib/format.ts'

/**
 * How each kind of record spells a name.
 *
 * Four shapes, four spellings: a teacher's record says `firstname`, a pupil's
 * and a guardian's say `fname`, and the office's own says `surname` beside
 * `lastname` and nothing else. Read in this order so the two-field office
 * record still yields both halves.
 */
const FIRST_KEYS = ['firstname', 'fname', 'first_name', 'surname']
const LAST_KEYS = ['lastname', 'lname', 'last_name']

function nameOf(profile: unknown, keys: string[]): string {
  if (!profile || typeof profile !== 'object') return ''
  const found = pick(profile as Record<string, unknown>, ...keys)
  return typeof found === 'string' ? found.trim() : ''
}

/**
 * What the person is, from `profile_type` rather than from `role_name`.
 *
 * The role name is free text a school can rename, and this one renames it
 * badly — a guardian's login comes back under the role "Rector". The profile
 * type is the truth, so it is what the sidebar says.
 */
export function roleLabel(profileType: ProfileType | undefined): string {
  // The same person, spelled two ways by two endpoints: the table is
  // `sparents` and login answers `parent`. "Sparent" is not a word to show a
  // guardian.
  const word = (profileType === 'sparent' ? 'parent' : (profileType ?? '')).replace(/_/g, ' ')
  return word ? capitalise(word) : ''
}

/**
 * The block at the foot of the sidebar, built from the signed-in account.
 *
 * The name comes off the **profile record**, not off the login. They disagree:
 * a teaching login reads NETPRO2 TEACHER2 while the staff record beside it
 * says Freeman Eke, and the staff record is the person. The login's own name
 * is the last resort, for a record that carries none at all.
 */
export function accountSummary(account: Account): AccountSummary {
  const { fname, lname, username } = account.user
  const profile = account.profile
  const first = nameOf(profile, FIRST_KEYS) || fname
  const last = nameOf(profile, LAST_KEYS) || lname
  const parts = [first, last].filter(Boolean)

  return {
    name: parts.join(' ') || username,
    line: roleLabel(account.profile_type) || account.role?.role_name || username,
    // An account with no name on it still needs two letters in the square.
    initials: (parts.length ? parts.map((part) => part[0]).join('') : username.slice(0, 2))
      .toUpperCase(),
  }
}
