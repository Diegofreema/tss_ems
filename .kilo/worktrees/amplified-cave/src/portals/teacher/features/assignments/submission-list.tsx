import { SquarePen } from 'lucide-react'
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
    { key: 'name', label: 'Student', cell: (row) => row.name, cardRole: 'title' },
    { key: 'adm', label: 'Adm. no.', cell: (row) => row.adm, cardRole: 'subtitle' },
    { key: 'submitted', label: 'Submitted', cell: (row) => row.submitted, nowrap: true },
    { key: 'score', label: 'Score', align: 'right', cell: (row) => row.score },
    {
      key: 'state',
      label: 'State',
      cardRole: 'tag',
      // Accent is "yours to do". A paper the answer key settled is not, so it
      // reads quiet beside one the school has on file — the two differ in
      // whether the school knows yet, which is the queue's business and not
      // the teacher's.
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
          // No `openLabel` beside it: opening the submission *is* the
          // action, and a menu whose two items do the same thing is a menu
          // somebody has to read twice to find that out.
          action={{
            label: (row) => (row.state === 'To mark' ? 'Mark' : 'Review'),
            danger: () => false,
            icon: SquarePen,
            onSelect: (row) => onOpen(row.id),
          }}
        />
      ) : (
        <EmptyState
          title="No submissions yet"
          body="Answers appear here as the students it was set for submit them. Nothing is marked before then."
        />
      )}
    </>
  )
}
