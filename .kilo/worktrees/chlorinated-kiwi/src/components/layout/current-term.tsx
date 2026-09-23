import { refSettings } from '@/db/collections/reference'
import { useHeldDocument } from '@/db/live'
import { formatDate } from '@/lib/format'

/**
 * The date the office set for the end of term, which the API stores and
 * returns as DD/MM/YYYY rather than as a timestamp. Anything else is shown
 * as it was given rather than guessed at.
 */
function endOfTerm(stored: string | undefined): string | undefined {
  const parts = stored?.split('/')
  if (parts?.length !== 3) return stored || undefined
  const [day, month, year] = parts.map(Number)
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? stored : formatDate(date)
}

/**
 * What the school is in, at the top of the office's rail.

 * It used to sit in the header, in small print on the right. The header is the
 * search box's now, and the term reads better as a card above the nav — the
 * same place the teacher's portal says which term it is marking into.
 *
 * Read from the one settings row rather than written down: this is the same
 * answer the Sessions and Terms registers change, and it was worth reading
 * live the moment either of them could move it. The row is the device's own
 * set now — a wire read here used to vanish from every page header the
 * moment the connection did.
 */
export function CurrentTerm() {
  const { doc } = useHeldDocument(refSettings)
  const calendar = doc?.calendar
  // Nothing rather than a placeholder — the header is one line of small print,
  // and a skeleton flashing in it is louder than the answer arriving late.
  if (!calendar?.session) return null

  const ends = endOfTerm(calendar.current_term_ends)
  return (
    <div className="mx-4 mb-(--rail-card) rounded-lg bg-ui-field px-4 py-(--rail-card)">
      <div className="text-2xs uppercase tracking-label text-muted-foreground">
        The school is in
      </div>
      <div className="mt-1 font-heading text-sm font-extrabold">
        {[calendar.session, calendar.semester].filter(Boolean).join(' · ')}
      </div>
      {ends && (
        <div className="mt-0.5 text-2xs text-muted-foreground">Term ends {ends}</div>
      )}
    </div>
  )
}
