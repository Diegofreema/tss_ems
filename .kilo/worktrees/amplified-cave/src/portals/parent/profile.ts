import type { Parent } from '../../api/parents/types.ts'
import { BLANK } from '../../features/collections/blank.ts'
import { parentName } from '../../features/collections/guardian-option.ts'
import { initialsOf, text } from '../../features/profile/record.ts'
import type { ProfileConfig } from '../../features/profile/types.ts'

/**
 * The household record, as the guardian reads it.
 *
 * Built from `GET /sparents/me`, which is a household rather than a person:
 * the API keeps a father and a mother on one row, each with their own name,
 * phone and job, and the login sits behind both. That is why this page names
 * two people where the other three portals name one.
 *
 * Every box is locked. There is no endpoint for a guardian to write their own
 * record — `POST /sparents/{id}` is the office's — so a box that took an edit
 * would be a box whose Save button had nowhere to go.
 */

const NOTE =
  'What the school holds about your household, and how it reaches you about your children. Ask the office to correct any of it — adding or removing a child is a separate request they review.'

const SESSION_NOTE =
  'Signs you out on every other phone and computer. This browser stays signed in.'

const FIELDS: ProfileConfig['fields'] = [
  { key: 'fullname', label: 'On record as', locked: true },
  { key: 'father', label: 'Father', locked: true },
  { key: 'mother', label: 'Mother', locked: true },
  { key: 'email', label: 'Email', locked: true },
  { key: 'address', label: 'Home address', locked: true, wide: true },
]

const PREFS: ProfileConfig['prefs'] = [
  {
    label: 'Email me when an invoice falls due',
    hint: 'Seven days before, then on the day',
    on: true,
  },
  { label: 'Email me when a result is published', hint: 'As it happens', on: true },
  { label: 'SMS if a child is marked absent', hint: 'Same morning', on: true },
]

/** The page for the moment before the record answers. */
const EMPTY: ProfileConfig = {
  initials: '··',
  meta: '',
  note: NOTE,
  sessionNote: SESSION_NOTE,
  fields: FIELDS,
  values: {
    fullname: '',
    father: BLANK,
    mother: BLANK,
    email: BLANK,
    address: BLANK,
  },
  // Left for the session to fill in: this shape is only reached when the
  // record did not answer, and the login is the one thing still known.
  account: [{ label: 'Signs in with', value: BLANK }],
  prefs: PREFS,
}

/** One parent as a line: whoever of the three things the record holds. */
function guardian(
  name: string | null | undefined,
  phone: string | null | undefined,
  job: string | null | undefined,
): string {
  return (
    [name, phone, job]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' · ') || BLANK
  )
}

export function parentProfile(parent?: Parent): ProfileConfig {
  if (!parent) return EMPTY

  const name = parentName(parent)
  // Expanded on the detail endpoint only. Counted where it came back and left
  // out where it did not — "0 children" on a household with three is worse
  // than a line that does not appear.
  const children = parent.children?.length

  return {
    ...EMPTY,
    initials: initialsOf([parent.fathersname, parent.mothersname]),
    meta: ['Guardian', children ? `${children} ${children === 1 ? 'child' : 'children'}` : '']
      .filter(Boolean)
      .join(' · '),
    values: {
      // A household with neither parent named still belongs to someone, so it
      // reads as whatever it can be recognised by.
      fullname: name || parent.pemailaddress?.trim() || 'Your household',
      // The two occupations are not on this record — the API selects them only
      // on the office's own directory route — so these lines are usually a
      // name and a phone, and say so by leaving the third part out.
      father: guardian(parent.fathersname, parent.fatherphone, parent.fathersjob),
      mother: guardian(parent.mothersname, parent.motherphone, parent.mothersjob),
      email: text(parent.pemailaddress),
      address: text(parent.address),
    },
    // No account status row: a deactivated guardian cannot sign in, so the
    // only person who ever reads this page is an active one.
    account: [
      { label: 'Signs in with', value: text(parent.username) },
      ...(children ? [{ label: 'Children linked', value: String(children) }] : []),
    ],
    // Already the household's own record: the session has nothing to add to it.
    fromRecord: true,
  }
}
