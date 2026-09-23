import { EmptyState } from '@/components/feedback/empty-state'
import { DataTable } from '@/components/data-table/data-table'
import type { Column } from '@/components/data-table/types'
import { TileStrip } from '@/components/page/tile-strip'
import { Tag } from '@/components/common/tag'
import type { Row } from '@/features/collections/types'

/**
 * Who sat one assignment.
 *
 * The three figures are the school's own rather than counted off the rows: a
 * list that ever pages would count only the page it sent, and "3 waiting" that
 * means "3 waiting on this screen" is worse than no figure.
 */
export function SubmissionList({
  rows,
  sat,
  marked,
  waiting,
  onOpen,
}: {
  rows: Row[]
  sat: number
  marked: number
  waiting: number
  onOpen: (submissionId: string) => void
}) {
  const columns: Column<Row>[] = [
    { key: 'name', label: 'Pupil', cell: (row) => row.name, cardRole: 'title' },
    { key: 'adm', label: 'Adm. no.', cell: (row) => row.adm, cardRole: 'subtitle' },
    { key: 'submitted', label: 'Submitted', cell: (row) => row.submitted, nowrap: true },
    { key: 'score', label: 'Score', align: 'right', cell: (row) => row.score },
    {
      key: 'state',
      label: 'State',
      cardRole: 'tag',
      cell: (row) => (
        <Tag variant={row.state === 'To mark' ? 'accent' : 'neutral'}>{row.state}</Tag>
      ),
    },
  ]

  return (
    <>
      <TileStrip
        className="mb-5"
        tiles={[
          { label: 'Submitted', value: String(sat) },
          { label: 'Marked', value: String(marked) },
          { label: 'Waiting on you', value: String(waiting) },
        ]}
      />

      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => onOpen(row.id)}
          action={{
            label: (row) => (row.state === 'To mark' ? 'Mark' : 'Review'),
            onSelect: (row) => onOpen(row.id),
          }}
        />
      ) : (
        <EmptyState
          title="No submissions yet"
          body="Answers appear here as the pupils it was set for submit them. Nothing is marked before then."
        />
      )}
    </>
  )
}
