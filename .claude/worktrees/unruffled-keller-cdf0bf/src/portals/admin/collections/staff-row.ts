import type { ActivityLog } from '../../../api/admins/types.ts'
import type { Place } from '../../../api/types.ts'
import type { Teacher, TeacherSubject } from '../../../api/teachers/types.ts'
import type { Admin } from '../../../api/users/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { countryIso } from '../../../features/collections/country-ids.ts'
import type { Row } from '../../../features/collections/types.ts'
import { formatDate } from '../../../lib/format.ts'

/**
 * Staff are two populations, not one. `GET /teachers` holds the teaching
 * record — qualification, CV, whether they advise an arm — and `GET /admins`
 * holds the office record, with privileges and a status. Neither endpoint
 * knows about the other, so a row carries which one it came from in its id.
 */
export type StaffKind = 'teacher' | 'admin'

/**
 * What the form's "Kind of record" select calls an office record.
 *
 * Held here rather than beside the form, because the rows have to answer in
 * exactly this word for an edit to open on the right kind.
 */
export const ADMINISTRATORS = 'Administrators'

const PREFIX: Record<StaffKind, string> = { teacher: 't', admin: 'a' }

/** e.g. "t-14". The register mixes both, so a bare id would be ambiguous. */
export function staffKey(kind: StaffKind, id: number | string): string {
  return `${PREFIX[kind]}-${id}`
}

/** Reads a key back. An id with no prefix is a teacher, the larger population. */
export function parseStaffKey(key: string): { kind: StaffKind; id: string } {
  const [head, ...rest] = key.split('-')
  if (head === PREFIX.admin && rest.length) return { kind: 'admin', id: rest.join('-') }
  if (head === PREFIX.teacher && rest.length) return { kind: 'teacher', id: rest.join('-') }
  return { kind: 'teacher', id: key }
}

/**
 * Which endpoint a save goes to. An existing record belongs to whichever list
 * it was read from and never moves between them — only a new one is still
 * being decided, by the pinned page it was opened from or by the form's own
 * role field.
 */
export function staffTarget(
  pinned: StaffKind | undefined,
  chosen: unknown,
  recordId?: string,
): StaffKind {
  if (recordId) return parseStaffKey(recordId).kind
  if (pinned) return pinned
  return chosen === ADMINISTRATORS ? 'admin' : 'teacher'
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** A foreign key as a select's value. A missing or zero id is no choice at all. */
function id(value: number | null | undefined): string {
  return value ? String(value) : ''
}

function fullName(...parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' ')
}

/** An ISO timestamp as the design writes dates. Anything else is left alone. */
function asDate(value: string | null | undefined): string {
  if (!value) return BLANK
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : formatDate(date)
}

/**
 * A teacher, as the register and their own record read them.
 *
 * The two endpoints behind this are not the same shape: the register sends the
 * teaching record with its login expanded, and `GET /teachers/{id}` adds the
 * class and the subjects on top. Everything the detail alone carries reads
 * blank on a register row rather than being fetched a second time per line.
 */
export function teacherRow(teacher: Teacher): Row {
  const subjects = teacher.subjects ?? []
  return {
    id: staffKey('teacher', teacher.id),
    name: text(fullName(teacher.firstname, teacher.middlename, teacher.lastname)),
    role: 'Teacher',
    phone: text(teacher.phone),
    gender: text(teacher.gender),
    // The teaching record has no status of its own; whether they can sign in
    // is `userstatus` on the login, which both endpoints expand.
    status: text(teacher.user?.userstatus),

    // Read by the record panel rather than the table.
    qualification: text(teacher.qualification),
    // The API spells this Yes/No; the panel says what it means.
    adviser: teacher.isadviser === 'Yes' ? 'Takes an arm' : 'No arm',
    // Two different things under two keys on purpose. `place` is for reading —
    // the street with the state and country after it — and `address` is the
    // API's own field, which the edit form writes straight back: prefilling
    // the composed line there would have saved the country into the street.
    place: text(placeOf(teacher)),
    address: text(teacher.address),
    about: text(teacher.profile),
    joined: asDate(teacher.date_created),
    username: text(teacher.user?.username),
    // Detail only. The register knows the id and not the name.
    department: text(teacher.department?.name),
    subjects: subjects.length ? subjects.map((one) => one.name).join(', ') : BLANK,
    subjectCount: teacher.subjects ? String(subjects.length) : BLANK,
    // What the assign flow opens ticked. Only the detail carries them, so a
    // row read off the register arrives with none — which is why that flow is
    // reached from the record page and not from the list.
    subjectIds: subjects.map((one) => String(one.id)).join(','),

    // The edit form is keyed as the endpoint is, and prefills from here.
    // `kind` is the form's own word, kept apart from `role` above: that one is
    // the job for reading, and the two coincide only for a teacher.
    kind: 'Teacher',
    firstname: teacher.firstname ?? '',
    lastname: teacher.lastname ?? '',
    middlename: teacher.middlename ?? '',
    department_id: id(teacher.department_id),
    profile: teacher.profile ?? '',
    // The form picks a country by ISO code and a state by the school's own id,
    // so an edit opens on what the record holds. A country the school's table
    // numbers but this app has never seen reads blank rather than wrong.
    country: countryIso(teacher.country_id),
    state: id(teacher.state_id),
    user_id: String(teacher.user_id),
  }
}

/**
 * Where they live, as one line.
 *
 * The API expands `state_id` and `country_id` independently and never checks
 * that they agree, so a record can come back as a state in one country beside
 * the name of another — one teacher on bronze reads "Andaman and Nicobar
 * Islands" under Nigeria. A state that does not belong to the country on the
 * record is dropped: a wrong address is worse than a short one.
 *
 * Written against the three fields rather than against a teacher, because an
 * administrator keeps the address on the office record and the country and
 * state on the login behind it.
 */
function placeOf(place: {
  address: string | null | undefined
  state?: Place | null
  country?: Place | null
}): string {
  const country = place.country?.name
  const state =
    place.state && place.state.country_id === place.country?.id
      ? place.state.name
      : undefined
  return [place.address, state, country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * One subject on a teacher's record. The class comes expanded on the subject
 * itself, so the tab names it without a second lookup.
 */
export function teacherSubjectRow(subject: TeacherSubject): Row {
  return {
    id: String(subject.id),
    name: text(subject.name),
    code: text(subject.subjectcode),
    klass: text(subject.department?.name),
    state: subject.status === 1 ? 'Active' : 'Inactive',
  }
}

/**
 * An office record. The API names the two halves of the name `surname` and
 * `lastname`, and takes them back under those same keys.
 */
export function adminRow(admin: Admin, roles?: ReadonlyMap<string, string>): Row {
  const held = admin.privileges ?? []
  return {
    id: staffKey('admin', admin.id),
    name: text(fullName(admin.surname, admin.lastname)),
    // The list sends `role_id` and does not expand the role, so the name comes
    // from `/users/roles` — without it every office record read the same word.
    role: roleName(admin, roles),
    phone: text(admin.phone),
    gender: text(admin.gender),
    // Whether the office record is live. Whether the person can sign in at all
    // is `account`, which is a different question with a different answer.
    status: titleCase(admin.status),
    account: text(admin.user?.userstatus),

    qualification: BLANK,
    adviser: BLANK,
    // The office record holds the address; the login holds the country and the
    // state, and only the detail expands them. Read as one line under `place`;
    // `address` stays the API's own field, which the edit form writes back.
    place: text(
      placeOf({
        address: admin.address,
        state: admin.user?.state,
        country: admin.user?.country,
      }),
    ),
    address: text(admin.address),
    joined: asDate(admin.date_created),

    // The form's "Kind of record", which is not the job. `role` above reads
    // "Bursar" or "Super Admin", and the select has no such option — so an
    // office record used to open on no kind at all, which took the teaching
    // half of the form with it.
    kind: ADMINISTRATORS,
    // The API calls the first half of the name `surname`; the form calls it
    // `firstname`, as it does for a teacher. Prefilling the wrong key left the
    // field blank on an edit, and saving that would have cleared the name.
    firstname: admin.surname ?? '',
    lastname: admin.lastname ?? '',
    department: text(admin.department?.name),
    department_id: id(admin.department_id),
    dob: text(admin.dob),
    username: text(admin.user?.username),
    user_id: String(admin.user_id),
    // The job as the office writes it — "ICT Director", "Registrar".
    title: text(admin.profile),

    // Only the privileges endpoint expands these; a row off the list carries
    // none, which is why the record page asks for them separately.
    privileges: held.length ? held.map((one) => one.name).join(', ') : BLANK,
    // The panel says how many and the tab says which. Eleven names joined into
    // one cell of a narrow column is a paragraph nobody reads.
    privilegeCount: held.length ? String(held.length) : BLANK,
    privilegeIds: held.map((one) => String(one.id)).join(','),
  }
}

/** The API lower-cases its statuses; the register does not. */
function titleCase(value: string | null | undefined): string {
  const word = value?.trim()
  return word ? word[0].toUpperCase() + word.slice(1) : BLANK
}

/**
 * What kind of account it is — Super Admin, Bursar, Secretary. The role is a
 * number on the login and named nowhere else, so a register without the
 * lookup says "Administrator" for all nine of them.
 */
function roleName(admin: Admin, roles?: ReadonlyMap<string, string>): string {
  const named = admin.user?.role?.role_name?.trim()
  if (named) return named
  const byId = admin.user?.role_id ? roles?.get(String(admin.user.role_id)) : undefined
  return byId?.trim() || 'Administrator'
}

/** One privilege on an administrator's tab, held or not. */
export function privilegeRow(
  privilege: { id: number; name: string },
  held: ReadonlySet<string>,
): Row {
  return {
    id: String(privilege.id),
    name: privilege.name,
    state: held.has(String(privilege.id)) ? 'Granted' : 'Not granted',
  }
}

/**
 * What deleting an office record takes with it. The API refuses two of these
 * outright — the first administrator and your own account — and the dialog is
 * where that belongs, before the button rather than in a toast after it.
 */
export function adminDeleteBody(row: Row | undefined): string {
  if (row?.id === staffKey('admin', 1)) {
    return 'This is the first administrator on the system and cannot be deleted — the school would be left with no way back in.'
  }
  const name = row?.name && row.name !== BLANK ? row.name : 'This administrator'
  return `${name} loses the office record and the login behind it, permanently. Their activity trail stays. If they are only leaving for a while, disable the sign-in instead — that keeps the record and can be undone.`
}

/**
 * What deleting a teaching record takes with it.
 *
 * Deliberately says less than the office record's: `DELETE /teachers/{id}` has
 * not been run against the school's server, so what it does to the login, the
 * subjects and the results entered under it is the server's business to state
 * and not this dialog's to guess.
 */
export function teacherDeleteBody(row: Row | undefined): string {
  const name = row?.name && row.name !== BLANK ? row.name : 'This teacher'
  return `${name} is taken off the teaching register for good, along with the subjects assigned to them. This cannot be undone from here.`
}

/** Whichever of the two the record belongs to. The register mixes them. */
export function staffDeleteBody(row: Row | undefined): string {
  return parseStaffKey(String(row?.id ?? '')).kind === 'admin'
    ? adminDeleteBody(row)
    : teacherDeleteBody(row)
}

/**
 * One line of an administrator's activity tab. Teachers have no equivalent
 * endpoint, so their tab comes back empty rather than borrowing this one.
 */
export function activityRow(log: ActivityLog): Row {
  return {
    id: String(log.id),
    when: asDate(log.timestamp),
    type: text(log.type),
    action: text(log.description || log.title),
    ip: text(log.ip),
  }
}
