import { SegmentedControl } from '@/components/common/segmented-control'
import { BLANK } from '@/features/collections/blank'
import type { RegisterRow, StatusOption } from './register'

/**
 * The roll: one row per student and the school's own words to mark them with,
 * each word wearing its own colour once it is chosen.
 *
 * A student nobody has marked shows no selected word and says "Not marked" —
 * never a pre-ticked Present, which would make an untaken register read as a
 * day when everybody turned up.
 *
 * **There is no note box** (the teacher's call, 2026-09-16). The register is
 * taken standing up in front of a class, and a free-text field on every row
 * was a column's width and a decision per pupil for something almost nobody
 * filled in. A note the school already holds is **not** discarded with the
 * box: it still rides on `RegisterRow` and is sent back with the mark, so
 * re-marking a pupil whose absence was explained does not quietly erase the
 * explanation.
 */
export function RegisterSheet({
  rows,
  statuses,
  waiting,
  onMark,
}: {
  rows: RegisterRow[]
  statuses: StatusOption[]
  /**
   * Students whose mark is written down on this device and not yet with the
   * school. Saying so on the row is what lets a teacher believe the sheet: the
   * mark is theirs, it is kept, and it has not been filed yet.
   */
  waiting: ReadonlySet<number>
  onMark: (studentId: number, status: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/60 bg-raised">
      <table className="w-full min-w-140 border-collapse text-sm">
        <thead>
          <tr className="border-b border-divider-strong text-left">
            <Th>Student</Th>
            <Th>Mark</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.student_id}
              style={{ animationDelay: `${index * 30}ms` }}
              className="animate-ems-row border-b border-divider last:border-b-0"
            >
              <td className="px-2 py-2.75">
                <div className="font-semibold">{row.name}</div>
                <div className="mt-0.5 text-2xs text-muted-foreground">
                  {row.regno || BLANK}
                  {!row.status && <span> · Not marked</span>}
                  {row.edited && <span className="text-brand"> · Unsaved</span>}
                  {!row.edited && waiting.has(row.student_id) && (
                    <span className="text-brand"> · Waiting to send</span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2.75">
                {/* A fieldset so the radios read as one group per student: the
                    control itself takes no label, and "Present" alone tells a
                    screen reader nothing about whose mark it is. */}
                <fieldset>
                  <legend className="sr-only">Mark for {row.name}</legend>
                  <SegmentedControl
                    name={`mark-${row.student_id}`}
                    value={row.status ?? ''}
                    options={statuses}
                    onChange={(status) => onMark(row.student_id, status)}
                  />
                </fieldset>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-2 py-2.75 text-2xs font-normal uppercase tracking-label text-muted-foreground ${className ?? ''}`}
    >
      {children}
    </th>
  )
}
