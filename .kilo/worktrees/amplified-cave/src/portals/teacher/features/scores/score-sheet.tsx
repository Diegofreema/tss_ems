import { Tag } from '@/components/common/tag'
import { Input } from '@/components/ui/input'
import { BLANK } from '@/features/collections/blank'
import { toneForStatus } from '@/lib/status-tone'
import { CA_MAX, EXAM_MAX } from './grade'
import type { SheetRow } from './sheet'

/**
 * The one table the design keeps on a phone: entering CA and Exam side by side
 * is the task, so the container scrolls horizontally instead of stacking.
 */
export function ScoreSheet({
  rows,
  onMarkChange,
}: {
  rows: SheetRow[]
  onMarkChange: (studentId: number, field: 'ca' | 'exam', value: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/60 bg-raised">
      <table className="w-full min-w-140 border-collapse text-sm">
        <thead>
          <tr className="border-b border-divider-strong text-left">
            <Th>Student</Th>
            <Th className="w-30 text-right">CA ({CA_MAX})</Th>
            <Th className="w-30 text-right">Exam ({EXAM_MAX})</Th>
            <Th className="w-22.5 text-right">Total</Th>
            <Th className="w-20">Grade</Th>
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
                  {row.adm || BLANK}
                  {row.problem && (
                    <span className="text-danger-ink"> · {row.problem}</span>
                  )}
                </div>
              </td>
              <MarkCell
                label={`CA for ${row.name}`}
                value={row.ca}
                invalid={Boolean(row.problem)}
                onChange={(value) => onMarkChange(row.student_id, 'ca', value)}
              />
              <MarkCell
                label={`Exam for ${row.name}`}
                value={row.exam}
                invalid={Boolean(row.problem)}
                onChange={(value) => onMarkChange(row.student_id, 'exam', value)}
              />
              <td className="px-2 py-2.75 text-right font-heading font-extrabold tabular-nums">
                {row.total}
              </td>
              <td className="px-2 py-2.75">
                {/* The school works the grade out; a row still being typed has
                    none until it has been filed. */}
                {row.grade ? (
                  <Tag variant={toneForStatus(row.grade)}>{row.grade}</Tag>
                ) : (
                  <span className="text-muted-foreground">
                    {row.edited ? (
                      'Unsaved'
                    ) : row.waiting ? (
                      // Saved on this device, not yet with the school — which
                      // is a different thing from unsaved, and the difference
                      // is the whole promise this page makes.
                      <span className="text-brand">Waiting to send</span>
                    ) : (
                      BLANK
                    )}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`px-2 py-2.75 text-2xs font-normal uppercase tracking-label text-muted-foreground ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

function MarkCell({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string
  value: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  return (
    <td className="px-2 py-2.75 text-right">
      <Input
        aria-label={label}
        aria-invalid={invalid}
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="ml-auto w-full max-w-21 text-right tabular-nums"
      />
    </td>
  )
}
