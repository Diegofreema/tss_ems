import type { Student, UpdateMyRecordBody } from '../../api/my-schooling/types.ts'
import { BLANK } from '../../features/collections/blank.ts'
import { asDate, fullName, initialsOf, text } from '../../features/profile/record.ts'
import type { ProfileConfig } from '../../features/profile/types.ts'
import { armOf } from './student.ts'

/**
 * The student's own record, as they read it.
 *
 * Built from `GET /students/me` — the admission number, the arm and the login
 * beside it, none of which the session carries. Two boxes take an edit: `POST
 * /students/me` accepts a phone and an address and refuses everything else, so
 * a student cannot move class, re-admit themselves or lift a suspension.
 */

const NOTE =
  'Your record as the school holds it. Your phone and address are yours to correct — ask the office about anything else, your name, your class and your admission number included.'

const SESSION_NOTE =
  'Use this if you signed in on a school computer and forgot to sign out.'

const FIELDS: ProfileConfig['fields'] = [
  { key: 'fullname', label: 'Full name', locked: true },
  { key: 'adm', label: 'Admission number', locked: true },
  { key: 'arm', label: 'Class', locked: true },
  // Locked, though the design has it as a box: the endpoint takes a phone and
  // an address and nothing else, so an email typed here would be thrown away.
  { key: 'email', label: 'Email', locked: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'address', label: 'Home address', required: true, wide: true },
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
    adm: BLANK,
    arm: BLANK,
    email: BLANK,
    phone: '',
    address: '',
  },
  // Left for the session to fill in: this shape is only reached when the
  // record did not answer, and the login is the one thing still known.
  account: [{ label: 'Signs in with', value: BLANK }],
  prefs: [
    { label: 'Email me when a result is published', hint: 'As it happens', on: true },
    { label: 'Remind me before an assignment closes', hint: 'The evening before', on: true },
    { label: 'Email me when a teacher shares material', hint: 'A daily digest', on: false },
  ],
}

export function studentProfile(student?: Student): ProfileConfig {
  if (!student) return EMPTY

  const arm = armOf(student)

  return {
    ...EMPTY,
    initials: initialsOf([student.fname, student.lname]),
    // No term. The design's third part is the school calendar, and every
    // endpoint holding it is refused a student login.
    meta: [student.regno, arm].map((part) => part?.trim()).filter(Boolean).join(' · '),
    values: {
      fullname: fullName(student.fname, student.mname, student.lname),
      adm: text(student.regno),
      arm: text(arm),
      email: text(student.email),
      phone: student.phone ?? '',
      address: student.address ?? '',
    },
    account: [
      { label: 'Signs in with', value: text(student.user?.username) },
      // Whether the login works at all, which is a different thing from being
      // admitted: a student kept on the roll can still have a disabled account.
      { label: 'Sign-in', value: text(student.user?.userstatus) },
      { label: 'On record since', value: asDate(student.joindate) },
    ],
    // Already the student's own record: the session has nothing to add to it.
    fromRecord: true,
  }
}

/**
 * The profile form as `POST /students/me` wants it. Only the two fields the
 * endpoint accepts are sent — the locked boxes are the office's, and an empty
 * one is dropped rather than blanking what the school holds.
 */
export function studentContactBody(values: Record<string, unknown>): UpdateMyRecordBody {
  const box = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string).trim() || undefined : undefined

  return { phone: box('phone'), address: box('address') }
}
