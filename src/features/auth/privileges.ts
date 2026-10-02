// Relative and extensioned, like the rest of what the node test runner reads.
import type { Account } from '../../api/auth/types.ts'
import type { Admin, Privilege } from '../../api/users/types.ts'
import { isSuperAdmin } from './role.ts'

/**
 * What an office account may open, read off its privileges.
 *
 * The school grants an administrator a list of named sections
 * (`GET /admins/{id}/privileges`), and the portal shows only the pages those
 * sections cover. The API refuses what it refuses whatever this says; this is
 * so the office is not offered a page that will answer "not allowed", which on
 * a register reads exactly like an empty school.
 *
 * Neither the API nor its document says which page each privilege guards, so
 * the map below is the school's decision, taken 2026-10-02 — not something
 * read off the server. Where the server's own behaviour is known it agrees:
 * `GET /search` leaves students *and* guardians out together for an account
 * without Student, which is why the parents' register sits under it.
 */

/** The sections the school can grant, by what this app calls them. */
export type Section =
  | 'admission'
  | 'student'
  | 'result'
  | 'report'
  | 'transcript'
  | 'setting'
  | 'admin'
  | 'news'
  | 'library'
  | 'hostels'
  | 'emails'
  | 'fees'
  | 'attendance'
  | 'timetable'
  | 'parentMessaging'
  | 'assignments'
  | 'classes'

/**
 * Each section by its catalogue ids and every name it has gone by.
 *
 * The name is read first because it is what the school sees and edits: the
 * catalogue's ninth entry was "HRM" and is "Library" now, and either spelling
 * is the same grant. The id answers only for a name this list has never seen —
 * a school that renames "Report" to "Reports and accounts" still means row 4.
 *
 * Read off the live school 2026-10-02, which lists eighteen where the API
 * document shows eleven: 12–18 were added for the parts of the portal the
 * first eleven had no word for, and "Library" is there twice (9 and 13).
 */
const CATALOGUE: { section: Section; ids: number[]; names: string[] }[] = [
  { section: 'admission', ids: [1], names: ['admission', 'admissions'] },
  { section: 'student', ids: [2], names: ['student', 'students'] },
  { section: 'result', ids: [3], names: ['result', 'results'] },
  { section: 'report', ids: [4], names: ['report', 'reports'] },
  { section: 'transcript', ids: [5], names: ['transcript', 'transcripts'] },
  { section: 'setting', ids: [6], names: ['setting', 'settings'] },
  { section: 'admin', ids: [7], names: ['admin', 'admins'] },
  { section: 'news', ids: [8], names: ['news and events', 'news', 'events'] },
  { section: 'library', ids: [9, 13], names: ['library', 'hrm'] },
  { section: 'hostels', ids: [10], names: ['hostels', 'hostel'] },
  { section: 'emails', ids: [11], names: ['manage emails', 'emails', 'email'] },
  { section: 'fees', ids: [12], names: ['fees and payments', 'fees', 'payments'] },
  { section: 'attendance', ids: [14], names: ['attendance'] },
  { section: 'timetable', ids: [15], names: ['timetable'] },
  { section: 'parentMessaging', ids: [16], names: ['parent messaging'] },
  { section: 'assignments', ids: [17], names: ['assignments and tests', 'assignments'] },
  { section: 'classes', ids: [18], names: ['subjects and classes', 'classes and subjects'] },
]

const spelling = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

/** The section one privilege grants, or null for one this app has no page for. */
export function sectionOf(privilege: Pick<Privilege, 'id' | 'name'>): Section | null {
  const name = spelling(privilege.name ?? '')
  const named = CATALOGUE.find((entry) => entry.names.includes(name))
  if (named) return named.section
  return CATALOGUE.find((entry) => entry.ids.includes(Number(privilege.id)))?.section ?? null
}

export function sectionsOf(privileges: readonly Pick<Privilege, 'id' | 'name'>[]): Set<Section> {
  const held = new Set<Section>()
  for (const privilege of privileges) {
    const section = sectionOf(privilege)
    if (section) held.add(section)
  }
  return held
}

/** Each section as the school's catalogue names it, for a sentence. */
export const SECTION_NAMES: Record<Section, string> = {
  admission: 'Admission',
  student: 'Student',
  result: 'Result',
  report: 'Report',
  transcript: 'Transcript',
  setting: 'Setting',
  admin: 'Admin',
  news: 'News and Events',
  library: 'Library',
  hostels: 'Hostels',
  emails: 'Manage Emails',
  fees: 'Fees and Payments',
  attendance: 'Attendance',
  timetable: 'Timetable',
  parentMessaging: 'Parent Messaging',
  assignments: 'Assignments and Tests',
  classes: 'Subjects and Classes',
}

/**
 * Which section each page of the office's portal belongs to, by the first
 * segment of its path under `/admin`.
 *
 * Keyed on the segment rather than the whole path so the generic record
 * routes are covered by the same line as the register: `/admin/students/12`,
 * `/admin/students/new` and `/admin/students/action` are all `students`. A
 * collection's id is the segment its record routes mount at, so every
 * register is named here once.
 *
 * The staff registers are under Admin, because the catalogue has no section
 * of its own for them. Transcript, Hostels, Parent Messaging and Assignments
 * and Tests have no page in the office's portal yet, so they open nothing.
 */
export const PAGE_SECTIONS: Record<string, Section> = {
  applicants: 'admission',

  students: 'student',
  parents: 'student',
  'parents-invited': 'student',

  attendance: 'attendance',
  'att-report': 'attendance',

  results: 'result',
  'result-queue': 'result',
  'class-sheet': 'result',
  performance: 'result',

  // The school-wide reading — enrolment, grades and money side by side.
  analytics: 'report',

  fees: 'fees',
  collect: 'fees',
  invoices: 'fees',
  spendings: 'fees',

  staff: 'admin',
  'staff-admin': 'admin',
  'staff-teachers': 'admin',
  'staff-other': 'admin',
  logs: 'admin',

  settings: 'setting',
  calendar: 'setting',
  terms: 'setting',

  classes: 'classes',
  arms: 'classes',
  subjects: 'classes',

  timetable: 'timetable',
  notices: 'news',
  messages: 'emails',

  library: 'library',
  lending: 'library',
  books: 'library',
}

/**
 * Pages every office account opens: the dashboard, the notices sent to them,
 * their own record, and the page that says another one is closed to them.
 * The empty string is the dashboard.
 */
export const OPEN_PAGES = ['', 'notifications', 'profile', 'closed'] as const

/**
 * Pages that are a window onto several sections, and open with any one of
 * them. The search box looks through the students and guardians (Student) and
 * the staff (Admin); holding neither, every result it could show is a record
 * this account may not open, so there is no box to offer.
 */
export const ANY_OF_PAGES: Record<string, Section[]> = {
  search: ['student', 'admin'],
}

/** The first path segment under the portal's base, `''` for the base itself. */
export function pageOf(pathname: string, basePath = '/admin'): string {
  // An address carried whole — the closed page's `from` — still has its query.
  const path = pathname.split(/[?#]/)[0]
  const rest = path.startsWith(basePath) ? path.slice(basePath.length) : path
  return rest.split('/').filter(Boolean)[0] ?? ''
}

/**
 * What one account may reach. `held` is null while nothing has been read —
 * no answer from the school and none kept on the device — and that is closed,
 * not open: offering a page on a guess is the thing this exists to stop.
 */
export type Access = {
  /** A super administrator holds every section, whatever their record lists. */
  everything: boolean
  held: ReadonlySet<Section> | null
}

export const NO_ACCESS: Access = { everything: false, held: null }

/**
 * What the signed-in account may reach.
 *
 * `fetched` is the privileges endpoint's answer, and it is believed over the
 * copy `/users/me` carries on the office record: it is the endpoint the
 * office edits through, so it is the one that is current. The record's copy
 * answers only where the endpoint never has on this device.
 */
export function accessOf(
  account: Account | null | undefined,
  fetched: readonly Pick<Privilege, 'id' | 'name'>[] | null | undefined,
): Access {
  if (isSuperAdmin(account)) return { everything: true, held: new Set() }
  const onRecord =
    account?.profile_type === 'admin' ? (account.profile as Admin | null)?.privileges : undefined
  const list = fetched ?? onRecord ?? null
  return { everything: false, held: list ? sectionsOf(list) : null }
}

export function holds(access: Access, section: Section): boolean {
  return access.everything || Boolean(access.held?.has(section))
}

/**
 * Whether a path in the office's portal may be opened.
 *
 * A page this module has never heard of is open, so a page added without a
 * line here still works; the test over `src/routes/admin` is what makes sure
 * none is.
 */
export function mayOpen(access: Access, pathname: string, basePath = '/admin'): boolean {
  if (access.everything) return true
  const page = pageOf(pathname, basePath)
  const any = ANY_OF_PAGES[page]
  if (any) return any.some((section) => holds(access, section))
  const section = PAGE_SECTIONS[page]
  return section ? holds(access, section) : true
}

/** Why a page is closed to an account, in a sentence the office can act on. */
export function closedBecause(pathname: string, basePath = '/admin'): string {
  const page = pageOf(pathname, basePath)
  const sections = ANY_OF_PAGES[page] ?? (PAGE_SECTIONS[page] ? [PAGE_SECTIONS[page]] : [])
  const named = sections.length
    ? `the ${sections.map((one) => SECTION_NAMES[one]).join(' or the ')} privilege`
    : 'a privilege'
  return `This page needs ${named}, and your account has not been granted it. An administrator who manages privileges can add it to your record; nothing here has been changed.`
}

/** A nav built for everybody, cut down to what this account may open. */
export function visibleNav<G extends { items: { to: string }[] }>(
  groups: readonly G[],
  may: (path: string) => boolean,
): G[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => may(item.to)) }))
    .filter((group) => group.items.length > 0)
}
