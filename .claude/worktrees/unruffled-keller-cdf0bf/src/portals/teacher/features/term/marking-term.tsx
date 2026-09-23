import { useMyResults } from '@/api/teaching/hooks'
import { ALL } from '../../collections/mine'
import { termFromResults } from './term'

/**
 * The term above the teacher's sidebar nav.
 *
 * A teaching login cannot read the school calendar — `/settings`, `/sessions`
 * and `/semesters` all answer "restricted to administrators" — so this is the
 * same answer the score sheet files into: the term on the newest mark this
 * teacher has. Reading it here rather than writing it down is what keeps the
 * two agreeing, and this block is where a teacher would look to check.
 */
export function MarkingTerm() {
  const marks = useMyResults({ limit: ALL })
  const term = termFromResults(marks.data?.items ?? [])
  // Nothing rather than a guess: a teacher who has never marked has no term to
  // show, and the score sheet says so where it matters.
  if (!term) return null

  return (
    <div className="border-b-2 border-divider px-4 pt-3.5 pb-2.5">
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        Marking for
      </div>
      <div className="mt-1 font-heading text-sm font-extrabold">{term.label}</div>
    </div>
  )
}
