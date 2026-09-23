import { adminsService } from '@/api/admins/service'
import { teachersService } from '@/api/teachers/service'
import type {
  CollectionDef,
  FormSectionSpec,
  ListPath,
  Row,
} from '@/features/collections/types'
import type { Paginated } from '@/api/types'
import { emptySource } from '@/features/collections/api'
import { superAdminSignedIn } from '@/features/auth/session'
import { optionLabels } from '@/features/collections/option-feeds'
import { usersService } from '@/api/users/service'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { adminBody, adminUpdate, teacherBody, teacherUpdate } from './staff-body'
import {
  activityRow,
  ADMINISTRATORS,
  adminRow,
  parseStaffKey,
  privilegeRow,
  staffDeleteBody,
  staffTarget,
  teacherRow,
  teacherSubjectRow,
} from './staff-row'

/**
 * The API keeps staff in two places, not one: `GET /teachers` is the teaching
 * record and `GET /admins` is the office record, and neither knows about the
 * other. Both are paged, so a single merged page would have to interleave two
 * pagings — this register switches between them on the role filter instead,
 * which keeps every page a real page of a real endpoint.
 */

async function listTeachers(page: number, q: string): Promise<Paginated<Row>> {
  const { items, pagination } = await teachersService.list({ page, limit: PAGE_SIZE, q })
  return { items: items.map(teacherRow), pagination }
}

async function listAdmins(page: number): Promise<Paginated<Row>> {
  // `GET /admins` takes no `q`, so the search box cannot narrow this one.
  const [{ items, pagination }, roles] = await Promise.all([
    adminsService.list({ page, limit: PAGE_SIZE }),
    // A feed that fails costs the column its words, not the page its rows.
    optionLabels('roles'),
  ])
  return { items: items.map((admin) => adminRow(admin, roles)), pagination }
}

/** Every office record on one page — a school has them in single figures. */
const ALL_ADMINS = 200

/**
 * One administrator, from `GET /users/admins/{id}`.
 *
 * The detail is the whole record in one call — the privileges, the class and
 * the login with its role, country and state — so nothing here is stitched
 * together out of the list. A 404 reaches the record page as a missing
 * record, and the copy below says what that means.
 */
const adminRecord = (id: string) => adminsService.get(id).then(adminRow)

/** A summary figure, read off the pagination that comes back with one row. */
const countTeachers = async () =>
  (await teachersService.list({ limit: 1 })).pagination.total

const countAdmins = async () => (await adminsService.list({ limit: 1 })).pagination.total

/** How many office logins can actually be used. */
const countLogins = async () => {
  const { items } = await adminsService.list({ limit: ALL_ADMINS })
  return items.filter((admin) => admin.user?.userstatus === 'Enabled').length
}

/** Reads one record from whichever endpoint its id says it came from. */
async function staffRecord(recordId: string): Promise<Row | undefined> {
  const { kind, id } = parseStaffKey(recordId)
  if (kind !== 'admin') return teacherRow(await teachersService.get(id))
  // Undefined rather than thrown: an id that is not on the register is the
  // record page's own not-found state, not a crash.
  return adminRecord(id)
}

/**
 * Writes the form back to the endpoint the record belongs to. Creating from
 * the combined register asks which of the two is being added; the pinned pages
 * already know, and pass their own kind.
 */
function saveStaff(kind?: 'teacher' | 'admin') {
  return async (values: Record<string, unknown>, recordId?: string) => {
    const target = staffTarget(kind, values.kind, recordId)

    if (recordId) {
      const { id } = parseStaffKey(recordId)
      return target === 'admin'
        ? adminsService.update(id, adminUpdate(values))
        : teachersService.update(id, teacherUpdate(values))
    }

    return target === 'admin'
      ? adminsService.create(adminBody(values))
      : teachersService.create(teacherBody(values))
  }
}

/**
 * Deletes from whichever of the two registers the record belongs to. Both are
 * permanent, and the API refuses the first administrator and your own account
 * outright — which the dialog says before the button rather than after it.
 */
function removeStaff(recordId: string): Promise<unknown> {
  const { kind, id } = parseStaffKey(recordId)
  return kind === 'admin' ? adminsService.remove(id) : teachersService.remove(id)
}

/**
 * Who may delete what. Removing an office record is a super administrator's
 * alone — the API refuses anyone else — and a teaching record is any
 * administrator's, so on the mixed register the answer is per row.
 */
function canRemoveStaff(row: Row): boolean {
  return parseStaffKey(row.id).kind !== 'admin' || superAdminSignedIn()
}

const ACTIVITY_LIMIT = 20

const IDENTITY: FormSectionSpec = {
  title: 'Staff member',
  fields: [
    { key: 'firstname', label: 'First name', required: true, placeholder: 'Chukwuma' },
    { key: 'lastname', label: 'Surname', required: true, placeholder: 'Nnaji' },
    { key: 'middlename', label: 'Middle name', placeholder: 'Obinna' },
    { key: 'gender', label: 'Gender', options: ['Female', 'Male'] },
    { key: 'phone', label: 'Phone', numeric: true, placeholder: '0803 441 2280' },
    { key: 'department_id', label: 'Class', optionsFrom: 'classes' },
  ],
}

const ACCOUNT: FormSectionSpec = {
  title: 'Account',
  fields: [
    {
      key: 'username',
      label: 'Email',
      required: true,
      email: true,
      wide: true,
      hint: 'The address they sign in with.',
      placeholder: 'c.nnaji@school.ng',
    },
    { key: 'address', label: 'Home address', multiline: true, wide: true, placeholder: '2 Aba Road, Enugu' },
  ],
}

/**
 * Whether the form is filling in a teaching record.
 *
 * Nothing chosen yet reads as teaching, which is what the save does with it
 * too — the register's larger half, and the one the office reaches for.
 */
function isTeaching(values: Record<string, unknown>): boolean {
  return values.kind !== ADMINISTRATORS
}

/**
 * Where they live, which only the teaching record takes — `POST /admins/new-admin`
 * accepts neither field, so the office form does not ask for them.
 */
const PLACE: FormSectionSpec = {
  title: 'Where they live',
  when: isTeaching,
  fields: [
    {
      key: 'country',
      label: 'Country',
      hint: 'The school’s server keeps its own list of countries and publishes no catalogue, so only the ones it has been seen to hold can be saved. Anything else is stored without a country.',
      optionsFrom: 'countries',
    },
    {
      key: 'state',
      label: 'State',
      optionsFrom: 'states',
      dependsOn: 'country',
    },
  ],
}

const TEACHING: FormSectionSpec = {
  title: 'Teaching',
  when: isTeaching,
  fields: [
    {
      key: 'qualification',
      label: 'Qualification',
      wide: true,
      placeholder: 'B.Sc Mathematics',
      hint: 'Held on the teaching record only.',
    },
    {
      key: 'profile',
      label: 'About',
      multiline: true,
      wide: true,
      placeholder: 'What pupils and parents see when they look this teacher up.',
      hint: 'Held on the teaching record only.',
    },
  ],
}

const STAFF_COLUMNS: CollectionDef['columns'] = [
  { key: 'name', label: 'Name', cardRole: 'title' },
  { key: 'role', label: 'Role', cardRole: 'subtitle' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
]

/** What the record panel reads, whichever of the two opened it. */
const STAFF_DETAIL = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'gender', label: 'Gender' },
  { key: 'phone', label: 'Phone' },
  { key: 'place', label: 'Address' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'adviser', label: 'Form arm' },
  { key: 'department', label: 'Class' },
  { key: 'joined', label: 'On record since' },
  { key: 'username', label: 'Signs in with' },
]

/**
 * The audit trail, which only the office record keeps. A teacher's tab comes
 * back empty rather than calling an endpoint that would answer for whichever
 * admin happens to share their id.
 */
const ACTIVITY_TAB: CollectionDef['tabs'] = [
  {
    label: 'Activity',
    columns: [
      { key: 'when', label: 'When' },
      { key: 'type', label: 'Type' },
      { key: 'action', label: 'Action' },
      { key: 'ip', label: 'IP' },
    ],
    empty: 'No activity recorded against this record.',
    // Only the office record keeps a trail, so a teacher is not shown an
    // empty one — on the mixed register or anywhere else.
    when: (recordId) => parseStaffKey(recordId).kind === 'admin',
    source: async (recordId) => {
      const { kind, id } = parseStaffKey(recordId)
      if (kind !== 'admin') return []
      const activity = await adminsService.activityLogs(id, ACTIVITY_LIMIT)
      return activity.logs.map(activityRow)
    },
  },
]

/**
 * What a teacher carries, read from the same call the record itself comes
 * from — `GET /teachers/{id}` expands each subject with its class, so the tab
 * names both without a second lookup.
 */
const SUBJECTS_TAB: NonNullable<CollectionDef['tabs']>[number] = {
  label: 'Subjects',
  columns: [
    { key: 'name', label: 'Subject', cardRole: 'title' },
    { key: 'code', label: 'Code' },
    { key: 'klass', label: 'Class' },
    { key: 'state', label: 'State', tag: true },
  ],
  empty: 'This teacher carries no subjects yet.',
  // Subjects hang off the teaching record; an office record has none to show.
  when: (recordId) => parseStaffKey(recordId).kind === 'teacher',
  source: async (recordId) => {
    const { kind, id } = parseStaffKey(recordId)
    if (kind !== 'teacher') return []
    const teacher = await teachersService.get(id)
    return (teacher.subjects ?? []).map(teacherSubjectRow)
  },
}

export const staff: CollectionDef = {
  id: 'staff',
  tabs: [...(ACTIVITY_TAB ?? []), SUBJECTS_TAB],
  path: '/admin/staff',
  kicker: 'Staff',
  title: 'Manage staff',
  description:
    'Everyone the school employs. Teaching and office records are kept apart, so the role picks which register you are looking at.',
  action: 'Add staff member',
  searchHint: 'Search staff name',
  footer: 'Teaching and office records',
  emptyTitle: 'No staff records',
  emptyBody: 'Add your teaching and office staff to assign subjects and arms.',
  missingTitle: 'Record not found',
  missingBody: 'This staff record could not be opened. Ask your ICT desk to look at it.',
  noun: 'staff member',
  nameKey: 'name',
  counts: [
    { label: 'Teachers', count: countTeachers },
    { label: ADMINISTRATORS, count: countAdmins },
  ],
  columns: STAFF_COLUMNS,
  detail: STAFF_DETAIL,
  filters: [
    // Unset, the register is the teaching staff — much the larger of the two.
    // Picking the other one is not a narrowing: it is the other register.
    { key: 'role', label: 'Teachers', options: [ADMINISTRATORS], replaces: true },
  ],
  source: ({ page, q, filters }) =>
    filters.role === ADMINISTRATORS ? listAdmins(page) : listTeachers(page, q),
  record: staffRecord,
  save: saveStaff(),
  // Both registers delete, and the dialog says which one it is about.
  remove: removeStaff,
  removeWhen: canRemoveStaff,
  removeBody: staffDeleteBody,
  // Asked first, because it decides what the rest of the form asks for: the
  // two halves of the register are two endpoints, and they take different
  // fields.
  form: [
    {
      title: 'Kind of record',
      fields: [
        {
          key: 'kind',
          label: 'Kind of record',
          required: true,
          options: ['Teacher', ADMINISTRATORS],
          hint: 'A teaching record carries subjects, a class and a qualification; an office record carries privileges. This is what decides which fields follow.',
        },
      ],
    },
    IDENTITY,
    ACCOUNT,
    PLACE,
    TEACHING,
  ],
}

/**
 * The two sub-routes are the same records pinned to one endpoint, so they
 * inherit the base definition's columns, panel and delete behaviour.
 */
function staffSlice(
  id: string,
  path: ListPath,
  title: string,
  description: string,
  overrides: Partial<CollectionDef>,
): CollectionDef {
  return {
    ...staff,
    id,
    path,
    title,
    description,
    counts: undefined,
    filters: undefined,
    ...overrides,
  }
}

/**
 * Every privilege the school can grant, and the ones this administrator has.
 * The catalogue lives nowhere else — there is no `/privileges` endpoint — so
 * it is read off whichever administrator is being looked at.
 */
async function privilegeTab(recordId: string): Promise<Row[]> {
  const { kind, id } = parseStaffKey(recordId)
  if (kind !== 'admin') return []
  const { admin, available } = await adminsService.privileges(id)
  const held = new Set((admin.privileges ?? []).map((one) => String(one.id)))
  return available.map((privilege) => privilegeRow(privilege, held))
}

export const staffAdmin = staffSlice(
  'staff-admin',
  '/admin/staff-admin',
  'Administrators',
  'The people who run the office: the principal, the bursary and the heads of section. These accounts see the admin portal, and what each one can open is set by their privileges.',
  {
    action: 'Add administrator',
    // Not "no such administrator": they are on the register, and the office
    // can see them there. `GET /users/admins/{id}` refuses any record whose
    // login carries country 0 — seven of the nine on bronze — so the page
    // names the fault rather than blaming the link.
    missingTitle: 'Record not found',
    missingBody:
      'This account could not be opened, so its privileges cannot be changed. Its sign-in can still be turned on or off from the register. Ask your ICT desk to look at it.',
    footer: 'Office records',
    emptyTitle: 'No office records',
    emptyBody: 'Add an administrator to give someone access to this portal.',
    // `GET /admins` takes no search parameter.
    searchable: false,
    noun: 'administrator',
    counts: [
      { label: ADMINISTRATORS, count: countAdmins },
      { label: 'Signed in with', count: countLogins },
    ],
    columns: [
      { key: 'name', label: 'Name', cardRole: 'title' },
      { key: 'title', label: 'Job', cardRole: 'subtitle' },
      { key: 'role', label: 'Account' },
      { key: 'phone', label: 'Phone' },
      { key: 'account', label: 'Sign-in', tag: true, cardRole: 'tag' },
    ],
    detail: [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Account' },
      { key: 'account', label: 'Sign-in' },
      { key: 'username', label: 'Signs in with' },
      { key: 'privilegeCount', label: 'Privileges' },
      { key: 'phone', label: 'Phone' },
      { key: 'gender', label: 'Gender' },
      { key: 'place', label: 'Address' },
      { key: 'department', label: 'Class' },
      { key: 'joined', label: 'On record since' },
    ],
    // Turning the sign-in off keeps the record, the trail and the privileges,
    // and is the answer to almost everything a delete is reached for.
    rowAction: {
      label: (row) => (row.account === 'Disabled' ? 'Enable sign-in' : 'Disable sign-in'),
      title: (row) =>
        row.account === 'Disabled' ? 'Let them sign in again?' : 'Stop them signing in?',
      cta: (row) => (row.account === 'Disabled' ? 'Enable the sign-in' : 'Disable the sign-in'),
      // Putting the state back needs no dialog; taking it away does.
      confirm: (row) =>
        row.account === 'Disabled'
          ? undefined
          : 'They keep the office record, the privileges and everything they have already done — they simply cannot sign in until this is put back.',
      done: (row) =>
        row.account === 'Disabled'
          ? `${row.name} can sign in again`
          : `${row.name} can no longer sign in`,
      run: (row) =>
        usersService.setStatus({
          id: row.user_id,
          status: row.account === 'Disabled' ? 'Enabled' : 'Disabled',
        }),
    },
    source: ({ page }) => listAdmins(page),
    save: saveStaff('admin'),
    tabs: [
      {
        label: 'Privileges',
        columns: [
          { key: 'name', label: 'Privilege' },
          { key: 'state', label: 'State', tag: true },
        ],
        empty: 'There are no privileges to grant.',
        // Privileges belong to the office record; a teaching record has none.
        when: (recordId) => parseStaffKey(recordId).kind === 'admin',
        source: privilegeTab,
      },
      ...(ACTIVITY_TAB ?? []),
    ],
    form: [IDENTITY, ACCOUNT],
  },
)

/**
 * What a teacher's record page reads. It is not the office panel: a teaching
 * record carries a qualification, an arm and the subjects it is trusted with,
 * and carries no privileges, no job title and no status of its own.
 */
const TEACHER_DETAIL = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Sign-in' },
  { key: 'username', label: 'Signs in with' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'adviser', label: 'Form arm' },
  { key: 'department', label: 'Class' },
  { key: 'subjectCount', label: 'Subjects' },
  { key: 'place', label: 'Address' },
  { key: 'about', label: 'About' },
  { key: 'joined', label: 'On record since' },
]

export const staffTeachers = staffSlice(
  'staff-teachers',
  '/admin/staff-teachers',
  'Teachers',
  'Everyone who carries a subject. These accounts see the teacher portal and enter scores.',
  {
    action: 'Add teacher',
    noun: 'teacher',
    missingTitle: 'Record not found',
    missingBody: 'This teaching record is not on the register.',
    footer: 'Teaching records',
    emptyTitle: 'No teaching records',
    emptyBody: 'Add a teacher to assign them subjects and an arm.',
    detail: TEACHER_DETAIL,
    tabs: [SUBJECTS_TAB],
    source: ({ page, q }) => listTeachers(page, q),
    save: saveStaff('teacher'),
    form: [IDENTITY, ACCOUNT, PLACE, TEACHING],
  },
)

/**
 * Non-teaching staff — library, ICT, health, security. The API has no register
 * for them: a person is either a teaching record or an office one, and the
 * logins behind them cannot be listed by role. The page says so rather than
 * showing people who are not there.
 */
export const staffOther = staffSlice(
  'staff-other',
  '/admin/staff-other',
  'Other staff',
  'Non-teaching staff — library, ICT, health and security.',
  {
    footer: 'No separate register',
    emptyTitle: 'Non-teaching staff are not kept apart',
    emptyBody:
      'This school’s records hold teaching staff and office staff only. A librarian or a security officer is added as an office record, and appears under Administrators.',
    searchable: false,
    source: emptySource,
    counts: undefined,
    // Adding one here writes the office record the empty state points at, so
    // the button does what the page says rather than nothing.
    form: [IDENTITY, ACCOUNT],
    save: saveStaff('admin'),
  },
)
