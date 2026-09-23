import { logsService } from '@/api/logs/service'
import type { LogType } from '@/api/logs/types'
import type { CollectionDef } from '@/features/collections/types'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { queryClient } from '@/lib/query-client'
import { logRange, logRow, RANGES } from './log-row'

/** The four actions the API records. Anything else it would not answer for. */
const LOG_TYPES: readonly LogType[] = ['Add', 'Edit', 'Delete', 'Login']

/**
 * A count per type, from the one endpoint that answers for all four at once.
 * The four tiles ask for it together, and react-query collapses that into a
 * single request rather than counting the log four times over.
 */
const typeCounts = () =>
  queryClient.ensureQueryData({
    queryKey: ['logs', 'types'],
    queryFn: () => logsService.types(),
    staleTime: 60_000,
  })

const countLogs = (type: LogType) => async () => (await typeCounts())[type] ?? 0

export const logs: CollectionDef = {
  id: 'logs',
  path: '/admin/logs',
  kicker: 'School',
  title: 'Activity log',
  description:
    'Every administrative action, who performed it and when. The log is written to, never edited.',
  // Nothing is added here by hand, so nothing offers to. `readonly` also takes
  // the pencil and the bin off the rows and 404s the edit URL behind them.
  readonly: true,
  action: 'Activity log',
  searchHint: 'Search action, description or IP',
  footer: 'Newest first',
  emptyTitle: 'No activity in this range',
  emptyBody: 'Widen the date range or clear the filters to see entries.',
  noun: 'entry',
  nameKey: 'action',
  counts: [
    { label: 'Added', count: countLogs('Add') },
    { label: 'Edited', count: countLogs('Edit') },
    { label: 'Deleted', count: countLogs('Delete') },
    { label: 'Sign-ins', count: countLogs('Login') },
  ],
  columns: [
    { key: 'when', label: 'When', cardRole: 'subtitle' },
    { key: 'user', label: 'User' },
    { key: 'type', label: 'Type', tag: true },
    { key: 'action', label: 'Action', cardRole: 'title' },
    { key: 'ip', label: 'IP' },
  ],
  detail: [
    { key: 'when', label: 'When' },
    { key: 'user', label: 'User' },
    { key: 'type', label: 'Type' },
    { key: 'title', label: 'Action' },
    { key: 'description', label: 'Detail' },
    { key: 'ip', label: 'IP' },
  ],
  filters: [
    { key: 'type', label: 'Any type', options: LOG_TYPES },
    { key: 'range', label: 'Any time', options: RANGES },
  ],
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await logsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      type: LOG_TYPES.includes(filters.type as LogType)
        ? (filters.type as LogType)
        : undefined,
      ...logRange(filters.range, new Date()),
    })
    return { items: items.map(logRow), pagination }
  },
  record: (recordId) => logsService.get(recordId).then(logRow),
}
