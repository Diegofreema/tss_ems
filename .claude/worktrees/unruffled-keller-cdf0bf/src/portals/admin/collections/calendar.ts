import { sessionsService, termsService } from '@/api/calendar/service'
import { settingsService } from '@/api/settings/service'
import type { CollectionDef } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { queryClient } from '@/lib/query-client'
import {
  currentAction,
  sessionDeleteBody,
  sessionRow,
  termDeleteBody,
  termRow,
} from './calendar-row'

/**
 * Sessions and terms are two registers, not one list with a type column: a
 * school opens a session every year and never touches its three terms again,
 * and the two are deleted, renamed and made current entirely separately. Each
 * page carries a button to the other.
 *
 * Neither carries dates. The API keeps a session as a name and a flag, and the
 * term the school is in is a school setting — so the only dates anywhere near
 * this are `current_term_ends` and `next_term_begins`, which live in Settings.
 */
export const sessions: CollectionDef = {
  id: 'calendar',
  path: '/admin/calendar',
  kicker: 'Academics',
  title: 'Academic sessions',
  description:
    'The school years everything is filed under. One is current at a time, and every invoice, result and registration is stamped with whichever it was.',
  action: 'Create session',
  searchHint: 'Search session',
  footer: 'Session register',
  emptyTitle: 'No sessions yet',
  emptyBody:
    'Nothing can be recorded until the school has a session — an invoice, a result and a registration are each filed under one.',
  noun: 'session',
  nameKey: 'name',
  secondaryTo: { to: '/admin/terms', label: 'Terms' },
  counts: [
    {
      label: 'Sessions',
      count: async () => (await sessionsService.list({ limit: 1 })).pagination.total,
    },
    {
      label: 'Terms',
      count: async () => (await termsService.list({ limit: 1 })).pagination.total,
    },
  ],
  columns: [
    { key: 'name', label: 'Session', cardRole: 'title' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
    { key: 'openedBy', label: 'Opened by', cardRole: 'subtitle' },
    { key: 'opened', label: 'Opened' },
  ],
  detail: [
    { key: 'name', label: 'Session' },
    { key: 'state', label: 'State' },
    { key: 'invoices', label: 'Invoices raised' },
    { key: 'payments', label: 'Payments taken' },
    { key: 'results', label: 'Results recorded' },
    { key: 'registrations', label: 'Subject registrations' },
    { key: 'openedBy', label: 'Opened by' },
    { key: 'opened', label: 'Opened' },
  ],
  // The endpoint that changes this is a school setting rather than anything on
  // the sessions resource — both registers only read `is_current`.
  rowAction: {
    ...currentAction('session'),
    // Every unfiltered screen is about the current session, so the whole cache
    // goes rather than being picked over — including the header's own chip.
    run: async (row) => {
      await settingsService.setCurrentSession(Number(row.id))
      await queryClient.invalidateQueries()
    },
  },
  source: async ({ page, q }) => {
    const { items, pagination } = await sessionsService.list({ page, limit: PAGE_SIZE, q })
    return { items: items.map(sessionRow), pagination }
  },
  record: (recordId) => sessionsService.get(recordId).then(sessionRow),
  save: (values, recordId) => {
    const body = { name: String(values.name ?? '').trim() }
    return recordId
      ? sessionsService.rename(recordId, body)
      : sessionsService.create(body)
  },
  // Never forced. Forcing leaves invoices, results and registrations pointing
  // at a year that is gone, and the API's refusal is the right answer.
  remove: (recordId) => sessionsService.remove(recordId),
  removeBody: sessionDeleteBody,
  form: [
    {
      title: 'Session',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: '2025/2026',
          hint: 'How the year reads on every invoice, result and report. It must be unique, and a session is only ever made current from the register.',
        },
      ],
    },
  ],
}

export const terms: CollectionDef = {
  id: 'terms',
  path: '/admin/terms',
  kicker: 'Academics',
  title: 'Terms',
  description:
    'The terms a session is divided into. One is current at a time, and results, tests and registrations are filed under whichever it was.',
  action: 'Create term',
  searchHint: 'Search term',
  footer: 'Term register',
  emptyTitle: 'No terms yet',
  emptyBody: 'A school needs at least one term before results or tests can be recorded against it.',
  noun: 'term',
  nameKey: 'name',
  secondaryTo: { to: '/admin/calendar', label: 'Sessions' },
  counts: [
    {
      label: 'Terms',
      count: async () => (await termsService.list({ limit: 1 })).pagination.total,
    },
    {
      label: 'Sessions',
      count: async () => (await sessionsService.list({ limit: 1 })).pagination.total,
    },
  ],
  columns: [
    { key: 'name', label: 'Term', cardRole: 'title' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Term' },
    { key: 'state', label: 'State' },
    { key: 'results', label: 'Results recorded' },
    { key: 'tests', label: 'Tests set' },
    { key: 'registrations', label: 'Subject registrations' },
    { key: 'assignments', label: 'Subject assignments' },
  ],
  rowAction: {
    ...currentAction('term'),
    run: async (row) => {
      await settingsService.setCurrentTerm(Number(row.id))
      await queryClient.invalidateQueries()
    },
  },
  source: async ({ page, q }) => {
    const { items, pagination } = await termsService.list({ page, limit: PAGE_SIZE, q })
    return { items: items.map(termRow), pagination }
  },
  record: (recordId) => termsService.get(recordId).then(termRow),
  save: (values, recordId) => {
    const body = { name: String(values.name ?? '').trim() }
    return recordId ? termsService.rename(recordId, body) : termsService.create(body)
  },
  remove: (recordId) => termsService.remove(recordId),
  removeBody: termDeleteBody,
  form: [
    {
      title: 'Term',
      fields: [
        {
          key: 'name',
          label: 'Name',
          required: true,
          wide: true,
          placeholder: 'First Term',
          hint: 'Most schools need only the three they already have. A term is only ever made current from the register.',
        },
      ],
    },
  ],
}
