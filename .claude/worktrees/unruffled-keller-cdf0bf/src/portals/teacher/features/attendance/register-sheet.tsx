import { SegmentedControl } from '@/components/common/segmented-control'
import { Input } from '@/components/ui/input'
import { BLANK } from '@/features/collections/blank'
import type { RegisterRow, StatusOption } from './register'

/**
 * The roll: one row per pupil, the school's own words to mark them with, and a
 * note beside it.
 *
 * A pupil nobody has marked shows no selected word and says "Not marked" —
 * never a pre-ticked Present, which would make an untaken register read as a
 * day when everybody turned up.
 */
export function RegisterSheet({
  rows,
  statuses,
  onMark,
  onNote,
}: {
  rows: RegisterRow[]
  statuses: StatusOption[]
  onMark: (studentId: number, status: string) => void
  onNote: (studentId: number, notes: string) => void
}) {
  return (
    <div className="overflow-x-auto border-2 border-divider">
      <table className="w-full min-w-[680px] border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b-2 border-divider text-left">
            <Th>Pupil</Th>
            <Th>Mark</Th>
            <Th className="w-[240px]">Note</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.student_id}
              style={{ animationDelay: `${index * 30}ms` }}
              className="animate-ems-row border-b border-divider last:border-b-0"
            >
              <td className="px-2 py-[11px]">
                <div className="font-semibold">{row.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {row.regno || BLANK}
                  {!row.status && <span> · Not marked</span>}
                  {row.edited && <span className="text-brand"> · Unsaved</span>}
                </div>
              </td>
              <td className="px-2 py-[11px]">
                {/* A fieldset so the radios read as one group per pupil: the
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
              <td className="px-2 py-[11px]">
                <Input
                  aria-label={`Note for ${row.name}`}
                  value={row.notes}
                  placeholder="Optional"
                  onChange={(event) => onNote(row.student_id, event.target.value)}
                />
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
      className={`px-2 py-[11px] text-[11px] font-normal uppercase tracking-[0.06em] text-muted-foreground ${className ?? ''}`}
    >
      {children}
    </th>
  )
}
