import { toast } from 'sonner'
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

/** A summary figure, read off the pagination that comes back with one row. */
const countParents = (status?: ParentStatus) => async () =>
  (await parentsService.list({ status, limit: 1 })).pagination.total

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
    empty: 'No pupil on the register is linked to this guardian yet.',
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
    'Parent accounts are created when you enrol a pupil, or you can add one directly.',
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
    run: (row) =>
      row.status === 'Deactivated'
        ? parentsService.activate(row.id)
        : parentsService.deactivate(row.id),
  },
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await parentsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      status: asStatus(filters.status),
    })
    return { items: items.map(parentRow), pagination }
  },
  record: (recordId) => parentsService.get(recordId).then(parentRow),
  save: async (values, recordId) => {
    if (recordId) return parentsService.update(recordId, parentBody(values))

    const created = await parentsService.create(parentBody(values))
    announceLogin(created)
    return created
  },
  // Refused with 409 while a pupil still points at the household, which the
  // confirm says before the button rather than a toast saying it after.
  remove: (recordId) => parentsService.remove(recordId),
  removeBody: parentDeleteBody,
  form: [FATHER, MOTHER, HOUSEHOLD],
}

/**
 * The sign-in the API just made for the household.
 *
 * `POST /sparents` answers with the username and the first password, and
 * nothing else ever will — there is no endpoint that reads a password back or
 * re-issues one. So it is put on screen and left there until it is dismissed,
 * rather than in a toast that clears itself while the office is still writing
 * it down.
 */
function announceLogin(created: { username?: string; password?: string }) {
  if (!created?.username || !created?.password) return
  // Raised a tick late on purpose. The save's own "Parent created" toast goes
  // up the moment this function returns, and sonner stacks the newest in
  // front — announcing first would leave the one thing worth reading buried
  // under the one that says nothing.
  setTimeout(() => {
    toast.success('Give the household these sign-in details', {
      description: `${created.username} — first password ${created.password}. Shown once. If it is lost, the guardian resets it from the sign-in page.`,
      duration: Infinity,
      closeButton: true,
    })
  }, 0)
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
