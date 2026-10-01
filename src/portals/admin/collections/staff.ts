import { enqueue } from '@/db/drain'
import type { WriteOutcome } from '@/db/write-outcome'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { BLANK } from '@/features/collections/blank'
import type { Admin } from '@/api/admins/types'
import type { Teacher } from '@/api/teachers/types'
import type { Role } from '@/api/users/types'
import { heldRows } from '@/db/collection'
import { refAdmins, refRoles, refTeachers } from '@/db/collections/reference'
import { localFirst } from '@/features/collections/local-first'
import { byId } from '@/features/collections/order'
import { byStaffKind } from './narrow'
import { adminsService } from '@/api/admins/service'
import { teachersService } from '@/api/teachers/service'
import { carriesFile } from '@/api/client'
import { DOCUMENT_MAX_BYTES } from '@/lib/file-size'
import type {
  CollectionDef,
  FieldSpec,
  FormSectionSpec,
  ListPath,
  Row,
} from '@/features/collections/types'
import type { Paginated } from '@/api/types'
import { emptySource } from '@/features/collections/api'
import { superAdminSignedIn } from '@/features/auth/session'
import { optionLabels } from '@/features/collections/option-feeds'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { adminBody, adminUpdate, teacherBody, teacherUpdate } from './staff-body'
import {
  activityRow,
  ADMINISTRATORS,
  adminRow,
  parseStaffKey,
  privilegeRow,
  staffDeleteBody,
  staffRowKind,
  staffTarget,
  TEACHERS,
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

/**
 * One administrator, from `GET /users/admins/{id}`.
 *
 * The detail is the whole record in one call — the privileges, the class and
 * the login with its role, country and state — so nothing here is stitched
 * together out of the list. A 404 reaches the record page as a missing
 * record, and the copy below says what that means.
 */
const adminRecord = (id: string) => adminsService.get(id).then(adminRow)

/** Summary figures, counted off the device like the registers they sit above. */
const countTeachers = async () => (await heldRows(refTeachers)).length

const countAdmins = async () => (await heldRows(refAdmins)).length

/** How many office logins can actually be used. */
const countLogins = async () =>
  (await heldRows(refAdmins)).filter((admin) => admin.user?.userstatus === 'Enabled')
    .length

/** Role id to the word an office account is called by. */
const roleNames = (roles: Role[]): ReadonlyMap<string, string> =>
  new Map(roles.map((role) => [String(role.id), role.role_name]))

/**
 * The staff register, read off the device.
 *
 * Both populations in one set, told apart by the kind their key already
 * carries: the page's dropdown swaps between two endpoints rather than
 * narrowing one, and the pinned pages are the same set with the swap decided
 * for them. The third slot is the role catalogue — `GET /admins` sends a
 * `role_id` and expands nothing, so without it every office record read the
 * same word.
 */
function staffBinding(only?: 'teacher' | 'admin') {
  return localFirst({
    entities: refTeachers,
    lookup: refAdmins,
    alsoLookup: refRoles,
    rows: (teachers: Teacher[], admins: Admin[], roles: Role[]) => {
      const named = roleNames(roles)
      return [
        ...(only === 'admin' ? [] : byId(teachers).map(teacherRow)),
        ...(only === 'teacher' ? [] : byId(admins).map((admin) => adminRow(admin, named))),
      ]
    },
    narrow: only
      ? undefined
      : (rows, filters) => byStaffKind(rows, filters, ADMINISTRATORS, staffRowKind),
    queued: queuedStaff(only),
    overlay: withQueuedLogins,
  })
}

/**
 * Staff records made on this device that the school has not seen yet.
 *
 * Without these a record created offline showed nowhere — the toast said
 * "Teacher created", the register still showed the old set, and the natural
 * next step was to add the teacher again: two ops in the queue, two teachers
 * when the drain ran. The row carries a `local:` id, which is what withholds
 * edit and delete until the school issues a real one.
 */
function queuedStaff(only?: 'teacher' | 'admin') {
  return (ops: readonly OutboxOp[]): Row[] =>
    ops
      .filter(
        (op) =>
          DRAWN_STATES.includes(op.state) &&
          typeof op.targetKey === 'string' &&
          ((only !== 'admin' && op.handler === WRITE.createTeacher) ||
            (only !== 'teacher' && op.handler === WRITE.createAdmin)),
      )
      .sort((one, two) => two.seq - one.seq)
      .map((op) => {
        const body = op.payload as Record<string, unknown>
        const office = op.handler === WRITE.createAdmin
        // The office body calls the first half of the name `surname`; the
        // teaching one calls it `firstname` — see `staff-body.ts`.
        const named = [office ? body.surname : body.firstname, body.lastname]
          .map((part) => String(part ?? '').trim())
          .filter(Boolean)
          .join(' ')
        return {
          id: op.targetKey as string,
          name: named || 'Unnamed record',
          role: office ? ADMINISTRATORS : TEACHERS,
          phone: String(body.phone ?? '').trim() || BLANK,
          gender: String(body.gender ?? '').trim() || BLANK,
          status: 'Waiting to send',
          account: BLANK,
        }
      })
}

/**
 * The sign-in changes this device has queued, written over the rows they are
 * about. Without this the register's own button read as one that did nothing:
 * the op was safely queued and the row went on saying what the school last
 * said. Later ops win, in `seq` order — disabling and re-enabling leaves it
 * enabled, which is the order the office did it in. Only ops still expected
 * to land are drawn.
 */
function withQueuedLogins(rows: Row[], ops: readonly OutboxOp[]): Row[] {
  const pending = new Map<string, string>()
  for (const op of [...ops].sort((one, two) => one.seq - two.seq)) {
    if (op.handler !== WRITE.setLogin || !DRAWN_STATES.includes(op.state)) continue
    const status = (op.payload as { status?: unknown }).status
    if (typeof op.targetKey === 'string' && typeof status === 'string') {
      pending.set(op.targetKey, status)
    }
  }

  if (pending.size === 0) return rows
  return rows.map((row) => {
    const status = pending.get(row.id)
    if (status === undefined) return row
    // The login's state prints under `account` on an office row and under
    // `status` on a teaching one — one field on the login, two registers.
    return staffRowKind(row) === 'admin' ? { ...row, account: status } : { ...row, status }
  })
}

/** Reads one record from whichever endpoint its id says it came from. */
async function staffRecord(recordId: string): Promise<Row | undefined> {
  // A record this device queued has no endpoint to read yet — the row on the
  // register is the whole of what is known about it.
  if (isLocalKey(recordId)) {
    return queuedStaff()(outbox().toArray).find((row) => row.id === recordId)
  }
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
  return (values: Record<string, unknown>, recordId?: string) => {
    const target = staffTarget(kind, values.kind, recordId)
    const office = target === 'admin'
    const named = String(values.surname ?? values.firstname ?? '').trim() || 'A record'

    if (recordId) {
      const { id } = parseStaffKey(recordId)
      return enqueue({
        handler: office ? WRITE.updateAdmin : WRITE.updateTeacher,
        payload: { id, body: office ? adminUpdate(values) : teacherUpdate(values) },
        collectionId: office ? SET.refAdmins : SET.refTeachers,
        targetKey: recordId,
        toast: { success: office ? 'Administrator updated' : 'Teacher updated' },
        label: `Staff record “${named}”`,
      })
    }

    const payload = office ? adminBody(values) : teacherBody(values)
    return enqueue({
      handler: office ? WRITE.createAdmin : WRITE.createTeacher,
      payload,
      collectionId: office ? SET.refAdmins : SET.refTeachers,
      targetKey: newLocalKey(),
      toast: { success: office ? 'Administrator created' : 'Teacher created' },
      label: `Staff record “${named}”`,
      // See `PHOTO`: a file goes now or not at all.
      wireOnly: carriesFile(payload)
        ? 'The passport photograph needs a connection to the school. Try again once you are back online, or remove it to save on this device.'
        : undefined,
    })
  }
}

/**
 * Deletes from whichever of the two registers the record belongs to. Both are
 * permanent, and the API refuses the first administrator and your own account
 * outright — which the dialog says before the button rather than after it.
 */
function removeStaff(recordId: string): Promise<WriteOutcome> {
  const { kind, id } = parseStaffKey(recordId)
  const office = kind === 'admin'
  return enqueue({
    handler: office ? WRITE.removeAdmin : WRITE.removeTeacher,
    payload: id,
    collectionId: office ? SET.refAdmins : SET.refTeachers,
    targetKey: recordId,
    toast: { success: office ? 'Administrator deleted' : 'Teacher deleted' },
    label: office ? 'An office record' : 'A teaching record',
  })
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
    // Required for everyone: `POST /admins/new-admin` refuses a record without
    // all three, and every teaching record on file carries them too — so the
    // form asks before the server does rather than after.
    { key: 'gender', label: 'Gender', required: true, options: ['Female', 'Male'] },
    {
      key: 'dob',
      label: 'Date of birth',
      date: true,
      // A birthday is behind us, so the picker opens on the years going back
      // rather than making the office scroll through eighteen of them.
      past: true,
      hint: 'The birthday on their staff record.',
    },
    { key: 'phone', label: 'Phone', required: true, numeric: true, placeholder: '0803 441 2280' },
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
    { key: 'address', label: 'Home address', required: true, multiline: true, wide: true, placeholder: '2 Aba Road, Enugu' },
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
 *
 * The state alone. There was a Country above it, and it was a choice with one
 * answer: the school numbers countries its own way, publishes no catalogue,
 * and the only states anybody has been able to number are Nigeria's — so
 * every other country in that list led to an empty State box, and the two
 * hundred-odd of them bought the office nothing but a step. The country is
 * implied by the state now, and `teacherBody` sends the school's id for it.
 */
const PLACE: FormSectionSpec = {
  title: 'Where they live',
  when: isTeaching,
  fields: [
    {
      key: 'state',
      label: 'State',
      optionsFrom: 'states',
      hint: 'The school’s server keeps its own list and publishes no catalogue, so only the states it has been read to hold can be saved.',
    },
  ],
}

/** The class field, shared by every register — an office record has one too. */
const CLASS_FIELD: FieldSpec = { key: 'department_id', label: 'Class', optionsFrom: 'classes' }

/**
 * Class and the arm the teacher takes, in one place.
 *
 * The arm is scoped by the class above it: nothing is offered until a class is
 * chosen, and then only that class's arms. It used to offer every arm in the
 * school, on the reasoning that a teacher's arm is any arm — which is true of
 * this school's data, where two of the four teachers who take an arm take one
 * outside their own class — but a list of every arm in a school is a list
 * nobody can pick from, and the office picking a class first is how they
 * actually think about it.
 *
 * One consequence, guarded rather than left to be found: editing a teacher
 * whose arm lies outside the class on their record opens with the arm box
 * empty, because that arm is not among the ones now offered. It is not lost —
 * `teacherBody` drops an empty `class_arm_id` rather than sending it null, so
 * a save that touched another field leaves them seated where they are — but
 * the panel beside the form is the honest reading of which arms they hold.
 */
const TEACHER_CLASS: FormSectionSpec = {
  title: 'Class',
  when: isTeaching,
  fields: [
    CLASS_FIELD,
    {
      key: 'class_arm_id',
      label: 'Class arm',
      // Narrowed on the device, not at the endpoint. `arms` filters the held
      // set by `department_id`, which is the same answer
      // `class-arms/for-department/{id}` gives and costs no request — so the
      // dropdown fills with no connection. See the feed in `option-feeds.ts`.
      optionsFrom: 'arms',
      dependsOn: 'department_id',
      hint: 'The arm they are class teacher of, if any. Pick the class first; leave empty for a subject teacher who takes no arm.',
    },
  ],
}

/*
 * An office record has no class section any more, on either register. A class
 * is what a teacher teaches; an administrator is not in front of one, and the
 * endpoint never insisted — `department_id` is optional on
 * `POST /admins/new-admin`, and the office was answering it because it was
 * asked. An edit made without the field does not clear a class already on
 * file: `common` drops an absent key rather than sending it empty, and the
 * record panel still shows one where the school holds it.
 */

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
      placeholder: 'What students and parents see when they look this teacher up.',
      hint: 'Held on the teaching record only.',
    },
  ],
}

/**
 * The teacher's passport photograph, sent as `passports` — the school's own
 * name for it, the same field `POST /teachers/me` takes. On a new teaching
 * record only: the office record takes no file, and the edit form is the
 * record's text.
 *
 * Optional, and it changes how the save travels: the queue cannot hold a
 * file, so a record carrying one goes to the school now or is not saved.
 */
const PHOTO: FormSectionSpec = {
  title: 'Passport photograph',
  when: isTeaching,
  fields: [
    {
      key: 'passports',
      label: 'Passport photograph',
      file: 'image/*',
      maxBytes: DOCUMENT_MAX_BYTES,
      wide: true,
      when: (record) => !record,
      hint: 'Optional, up to 1 MB. Attaching it means this record needs a connection to save.',
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
  { key: 'born', label: 'Date of birth' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
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
  collection: staffBinding(),
  source: ({ page, q, filters }) =>
    filters.role === ADMINISTRATORS ? listAdmins(page) : listTeachers(page, q),
  record: staffRecord,
  queue: saveStaff(),
  // Both registers delete, and the dialog says which one it is about.
  queueRemove: removeStaff,
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
          options: [TEACHERS, ADMINISTRATORS],
          hint: 'A teaching record carries subjects, a class and a qualification; an office record carries privileges. This is what decides which fields follow.',
        },
      ],
    },
    IDENTITY,
    TEACHER_CLASS,
    ACCOUNT,
    PLACE,
    TEACHING,
    PHOTO,
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
    collection: staffBinding('admin'),
    action: 'Add administrator',
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
    /*
     * Email rather than the Job column that was here. "Job" read
     * `admin.profile`, and across this whole school exactly one office record
     * has anything in it — the word "old teacher" — so the column was a
     * heading over three empty cells. The address they sign in with is the
     * thing the office actually looks a colleague up by, and it is on every
     * one of them.
     */
    columns: [
      { key: 'name', label: 'Name', cardRole: 'title' },
      { key: 'username', label: 'Email', cardRole: 'subtitle' },
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
      { key: 'born', label: 'Date of birth' },
      { key: 'address', label: 'Address' },
      { key: 'department', label: 'Class' },
      { key: 'joined', label: 'On record since' },
    ],
    // Turning the sign-in off keeps the record, the trail and the privileges,
    // and is the answer to almost everything a delete is reached for.
    rowAction: {
      label: (row) => (row.account === 'Disabled' ? 'Enable sign-in' : 'Disable sign-in'),
      tone: (row) => (row.account === 'Disabled' ? ('brand' as const) : ('danger' as const)),
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
      queueRun: (row) =>
        enqueue({
          handler: WRITE.setLogin,
          payload: {
            id: row.user_id,
            status: row.account === 'Disabled' ? 'Enabled' : 'Disabled',
          },
          collectionId: SET.refAdmins,
          targetKey: row.id,
          toast: {
            success:
              row.account === 'Disabled'
                ? `${row.name} can sign in again`
                : `${row.name} can no longer sign in`,
          },
          label: `Sign-in for “${row.name}”`,
        }),
    },
    source: ({ page }) => listAdmins(page),
    queue: saveStaff('admin'),
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
  { key: 'born', label: 'Date of birth' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'adviser', label: 'Form arm' },
  { key: 'department', label: 'Class' },
  { key: 'subjectCount', label: 'Subjects' },
  { key: 'address', label: 'Address' },
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
    /*
     * Its own columns, because the shared set carries Role — and on a register
     * that is nothing but teachers, Role reads "Teacher" on every line. It
     * earns its place on the mixed register, where it tells a teacher from a
     * bursar, and nowhere else. Email takes it: `user.username` is the address
     * the office types to reach them, and every teaching record on file
     * carries one.
     */
    columns: [
      { key: 'name', label: 'Name', cardRole: 'title' },
      { key: 'username', label: 'Email', cardRole: 'subtitle' },
      { key: 'phone', label: 'Phone' },
      { key: 'gender', label: 'Gender' },
      { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
    ],
    noun: 'teacher',
    footer: 'Teaching records',
    emptyTitle: 'No teaching records',
    emptyBody: 'Add a teacher to assign them subjects and an arm.',
    detail: TEACHER_DETAIL,
    tabs: [SUBJECTS_TAB],
    collection: staffBinding('teacher'),
    source: ({ page, q }) => listTeachers(page, q),
    queue: saveStaff('teacher'),
    form: [IDENTITY, TEACHER_CLASS, ACCOUNT, PLACE, TEACHING, PHOTO],
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
    // Deliberately not read off the device: there is no endpoint behind this
    // one, so it has nothing to hold. Spelled out because the register it is
    // built from does have a binding, and inheriting it would fill a page that
    // is meant to be empty with the whole staff list.
    collection: undefined,
    source: emptySource,
    counts: undefined,
    // Adding one here writes the office record the empty state points at, so
    // the button does what the page says rather than nothing.
    form: [IDENTITY, ACCOUNT],
    queue: saveStaff('admin'),
  },
)
