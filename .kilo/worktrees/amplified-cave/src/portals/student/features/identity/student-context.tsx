import { Tag } from '@/components/common/tag'
import { schoolingInvoices, schoolingRecord } from '@/db/collections/schooling'
import { useHeldDocument } from '@/db/live'
import { armOf, feeStanding } from '../../student'

/**
 * The student block above the student sidebar's nav: who this is, the class and
 * admission number the school knows them by, and where they stand on fees.
 *
 * Read off the school's own record rather than written down — the admission
 * number is the one thing a student is asked for at every desk in the school,
 * and a written-in one would be the one believed. The record and the ledger
 * are the device's sets now, so a student with no signal still has their own
 * name; the sync keeps both what the school last said.
 */
export function StudentContext() {
  const { doc: student } = useHeldDocument(schoolingRecord)
  const { doc: ledger } = useHeldDocument(schoolingInvoices)

  // Nothing rather than a skeleton: this block sits under the brand mark, and
  // a grey bar pulsing there is louder than the name arriving a moment late.
  if (!student) return null

  const fees = feeStanding(ledger?.invoices)
  const line = [armOf(student), student.regno]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-4 mb-4 rounded-lg bg-ui-field px-4 py-3">
      <div className="font-heading text-sm font-extrabold">
        {[student.fname, student.lname].filter(Boolean).join(' ')}
      </div>
      {line && <div className="mt-0.5 text-2xs text-muted-foreground">{line}</div>}
      {fees && (
        <Tag variant={fees.owing ? 'accent' : 'neutral'} className="mt-2">
          {fees.label}
        </Tag>
      )}
    </div>
  )
}
