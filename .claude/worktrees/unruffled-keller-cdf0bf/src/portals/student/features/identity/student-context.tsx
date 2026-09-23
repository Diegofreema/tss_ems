import { useMyStudentInvoices, useMyStudentRecord } from '@/api/my-schooling/hooks'
import { Tag } from '@/components/common/tag'
import { armOf, feeStanding } from '../../pupil'

/**
 * The pupil block above the student sidebar's nav: who this is, the class and
 * admission number the school knows them by, and where they stand on fees.
 *
 * Read live rather than written down — the admission number is the one thing a
 * pupil is asked for at every desk in the school, and a written-in one would
 * be the one believed.
 */
export function StudentContext() {
  const { data: student } = useMyStudentRecord()
  const { data: ledger } = useMyStudentInvoices()

  // Nothing rather than a skeleton: this block sits under the brand mark, and
  // a grey bar pulsing there is louder than the name arriving a moment late.
  if (!student) return null

  const fees = feeStanding(ledger?.invoices)
  const line = [armOf(student), student.regno]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="border-b-2 border-divider px-4 pt-3.5 pb-3">
      <div className="font-heading text-sm font-extrabold">
        {[student.fname, student.lname].filter(Boolean).join(' ')}
      </div>
      {line && <div className="mt-0.5 text-[11.5px] text-muted-foreground">{line}</div>}
      {fees && (
        <Tag variant={fees.owing ? 'accent' : 'neutral'} className="mt-2">
          {fees.label}
        </Tag>
      )}
    </div>
  )
}
