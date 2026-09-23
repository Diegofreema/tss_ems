import { useSchoolSettings } from '@/api/settings/hooks'
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
 * What the school is in, in the header of every admin page.
 *
 * Read from the one settings row rather than written down: this is the same
 * answer the Sessions and Terms registers change, and it was worth reading
 * live the moment either of them could move it.
 */
export function CurrentTerm() {
  const { data } = useSchoolSettings()
  const calendar = data?.calendar
  // Nothing rather than a placeholder — the header is one line of small print,
  // and a skeleton flashing in it is louder than the answer arriving late.
  if (!calendar?.session) return null

  const ends = endOfTerm(calendar.current_term_ends)
  return (
    <>
      <div className="uppercase tracking-[0.06em]">
        {[calendar.session, calendar.semester].filter(Boolean).join(' · ')}
      </div>
      {ends && <div>Term ends {ends}</div>}
    </>
  )
}
