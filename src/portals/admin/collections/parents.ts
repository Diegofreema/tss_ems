import type { Parent } from '@/api/parents/types'
import { heldRows } from '@/db/collection'
import { refParents } from '@/db/collections/reference'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { DRAWN_STATES, isLocalKey, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { BLANK } from '@/features/collections/blank'
import { localFirst } from '@/features/collections/local-first'
import { byId } from '@/features/collections/order'
import type { Row } from '@/features/collections/types'
import { pendingValues, withPendingState } from './pending-state'
import { parentsService } from '@/api/parents/service'
import type { ParentStatus } from '@/api/parents/types'
import type { CollectionDef, FormSectionSpec, ListPath } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { parentBody } from './parent-body'
import { accessAction, childRow, parentDeleteBody, parentRow } from './parent-row'

/**
 * The two words the API accepts, shown as the register writes them. The value
 * goes back down in lower case, which is the only spelling the endpoint takes.
 */
const STATUSES = ['Active', 'Deactivated'] as const

function asStatus(value: string | undefined): ParentStatus | undefined {
  const word = value?.toLowerCase()
  return word === 'active' || word === 'deactivated' ? word : undefined
}

/**
 * A summary figure, counted off the device — and counting the queue with it, so
 * a register showing a household blocked under a tile reading "Deactivated 0"
 * cannot disagree with itself in the same eyeful.
 */
const countParents = (status?: ParentStatus) => async () => {
  const all = await heldRows(refParents)
  const queued = pendingAccess(outbox().toArray)
  const standing = (parent: Parent) => {
    const active = queued.get(String(parent.id))
    if (active !== undefined) return active ? 'active' : 'deactivated'
    return String(parent.status ?? '').toLowerCase()
  }
  return status === undefined
    ? all.length
    : all.filter((parent) => standing(parent) === status).length
}

/** Which households this device has queued a change of sign-in for. */
const pendingAccess = (ops: readonly OutboxOp[]) =>
  pendingValues(ops, WRITE.setParentAccess, (payload) => {
    const change = payload as { id?: unknown; active?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), value: Boolean(change.active) }
  })

/** Households, with a queued block or reinstatement shown. */
const withPendingAccess = (rows: Row[], ops: readonly OutboxOp[]) =>
  withPendingState(rows, ops, WRITE.setParentAccess, (payload) => {
    const change = payload as { id?: unknown; active?: unknown } | null
    if (change?.id === undefined) return undefined
    return { id: String(change.id), state: change.active ? 'Active' : 'Deactivated' }
  })

/**
 * Households written on this device that the school has not seen. The sign-in
 * the school issues is not here — nothing on the device can know it — so the
 * status says what it is instead.
 */
function queuedParents(ops: readonly OutboxOp[]): Row[] {
  return ops
    .filter(
      (op) =>
        op.handler === WRITE.createParent &&
        DRAWN_STATES.includes(op.state) &&
        typeof op.targetKey === 'string',
    )
    .sort((one, two) => two.seq - one.seq)
    .map((op) => {
      const body = op.payload as Record<string, unknown>
      const named = [body.fathersname, body.mothersname]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' & ')
      return {
        id: op.targetKey as string,
        name: named || 'Unnamed household',
        phone: String(body.fatherphone ?? body.motherphone ?? '').trim() || BLANK,
        email: String(body.pemailaddress ?? '').trim() || BLANK,
        status: 'Waiting to send',
      }
    })
}

const FATHER: FormSectionSpec = {
  title: 'Father',
  fields: [
    { key: 'fathersname', label: 'Name', placeholder: 'Emmanuel Udo' },
    { key: 'fatherphone', label: 'Phone', numeric: true, placeholder: '0803 441 2280' },
    { key: 'fathersjob', label: 'Occupation', placeholder: 'Engineer' },
  ],
}

const MOTHER: FormSectionSpec = {
  title: 'Mother',
  fields: [
    { key: 'mothersname', label: 'Name', placeholder: 'Chidinma Udo' },
    { key: 'motherphone', label: 'Phone', numeric: true, placeholder: '0812 660 7714' },
    { key: 'mothersjob', label: 'Occupation', placeholder: 'Trader' },
  ],
}

const HOUSEHOLD: FormSectionSpec = {
  title: 'Household',
  fields: [
    {
      key: 'pemailaddress',
      label: 'Email',
      // The login the API makes for the household is the email — it comes back
      // from the save as the username. A household saved without one gets an
      // account nobody can sign in to.
      required: true,
      email: true,
      wide: true,
      placeholder: 'e.udo@example.com',
      hint: 'The address the guardian signs in with and receives invoices at.',
    },
    { key: 'address', label: 'Home address', multiline: true, wide: true, placeholder: '14 Ogui Road, Enugu' },
  ],
}

/**
 * Children come back for one household at a time, which is why the register
 * shows no count: a column would cost a request a row.
 */
const CHILDREN_TAB: CollectionDef['tabs'] = [
  {
    label: 'Children',
    columns: [
      { key: 'name', label: 'Child' },
      { key: 'adm', label: 'Adm. no.' },
      { key: 'class', label: 'Class' },
      { key: 'arm', label: 'Arm' },
      { key: 'status', label: 'Status', tag: true },
    ],
    source: (recordId) => parentsService.children(recordId).then((kids) => kids.map(childRow)),
    empty: 'No student on the register is linked to this guardian yet.',
  },
]

export const parents: CollectionDef = {
  id: 'parents',
  tabs: CHILDREN_TAB,
  path: '/admin/parents',
  kicker: 'Parents',
  title: 'All parents',
  description:
    'Parent and guardian accounts and the children linked to them. A household is one record, whether the school holds one parent or both.',
  action: 'Add parent',
  searchHint: 'Search parent name, email or phone',
  footer: 'Guardian accounts',
  emptyTitle: 'No parent accounts',
  emptyBody:
    'Parent accounts are created when you enrol a student, or you can add one directly.',
  noun: 'parent',
  nameKey: 'name',
  counts: [
    { label: 'Active', count: countParents('active') },
    { label: 'Deactivated', count: countParents('deactivated') },
  ],
  columns: [
    { key: 'name', label: 'Parent', cardRole: 'title' },
    { key: 'phone', label: 'Phone', cardRole: 'subtitle' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Household' },
    { key: 'status', label: 'Status' },
    { key: 'father', label: 'Father' },
    { key: 'mother', label: 'Mother' },
    { key: 'email', label: 'Email' },
    { key: 'children', label: 'Children' },
    { key: 'address', label: 'Address' },
    { key: 'username', label: 'Signs in with' },
  ],
  filters: [{ key: 'status', label: 'Any status', options: STATUSES }],
  // Blocking the sign-in is what a school actually wants nine times out of
  // ten: the household, its children and its invoices all stay, and it is the
  // one distinction the API draws between guardian accounts.
  rowAction: {
    ...accessAction,
    queueRun: (row) =>
      enqueue({
        handler: WRITE.setParentAccess,
        payload: { id: row.id, active: row.status === 'Deactivated' },
        collectionId: SET.refParents,
        targetKey: row.id,
        toast: {
          success:
            row.status === 'Deactivated'
              ? `${row.name} can sign in again`
              : `${row.name} can no longer sign in`,
        },
        label: `Household “${row.name}”`,
      }),
  },
  // Read off the device. A school's households are of the same order as its
  // students, and this is the register the office searches by name.
  collection: localFirst({
    entities: refParents,
    rows: (all: Parent[]) => byId(all).map(parentRow),
    narrow: (rows, filters) =>
      filters.status
        ? rows.filter((row) => row.status === filters.status)
        : rows,
    queued: queuedParents,
    overlay: withPendingAccess,
  }),
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await parentsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      status: asStatus(filters.status),
    })
    return { items: items.map(parentRow), pagination }
  },
  record: async (recordId) =>
    isLocalKey(recordId)
      ? queuedParents(outbox().toArray).find((row) => row.id === recordId)
      : parentsService.get(recordId).then(parentRow),
  /**
   * The sign-in the school makes for a new household is the one thing it says
   * once and never again, and a queued create hears it from the drain rather
   * than from this form — hours later, if that is when the connection returns.
   * The office gets the credentials late rather than being unable to register a
   * guardian at all, which for a school with no signal for days is the better
   * trade. See the note on the handler.
   */
  queue: (values, recordId) => {
    const body = parentBody(values)
    if (recordId) {
      return enqueue({
        handler: WRITE.updateParent,
        payload: { id: recordId, body },
        collectionId: SET.refParents,
        targetKey: recordId,
        toast: { success: 'Parent updated' },
        label: 'A household',
      })
    }
    return enqueue({
      handler: WRITE.createParent,
      payload: body,
      collectionId: SET.refParents,
      targetKey: newLocalKey(),
      toast: { success: 'Parent created' },
      label: 'A household',
    })
  },
  // Refused with 409 while a student still points at the household, which the
  // confirm says before the button rather than a toast saying it after.
  queueRemove: (recordId) =>
    enqueue({
      handler: WRITE.removeParent,
      payload: recordId,
      collectionId: SET.refParents,
      targetKey: recordId,
      toast: { success: 'Parent deleted' },
      label: 'A household',
    }),
  removeBody: parentDeleteBody,
  form: [FATHER, MOTHER, HOUSEHOLD],
}

/** A view over the same guardians, pinned to one status — see `staffSlice`. */
function parentSlice(
  id: string,
  path: ListPath,
  title: string,
  description: string,
  overrides: Partial<CollectionDef>,
): CollectionDef {
  return {
    ...parents,
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
 * Guardians blocked from signing in. Active or deactivated is the one
 * distinction the API draws between accounts, so it is the one slice of the
 * register worth its own page.
 */
export const parentsDeactivated = parentSlice(
  'parents-invited',
  '/admin/parents-invited',
  'Deactivated',
  'Guardians blocked from signing in. The household and its children stay on the register; only the login is closed.',
  {
    footer: 'Blocked accounts',
    emptyTitle: 'No accounts are blocked',
    emptyBody: 'Every guardian on the register can sign in.',
    source: async ({ page, q }) => {
      const { items, pagination } = await parentsService.list({
        page,
        limit: PAGE_SIZE,
        q,
        status: 'deactivated',
      })
      return { items: items.map(parentRow), pagination }
    },
  },
)
