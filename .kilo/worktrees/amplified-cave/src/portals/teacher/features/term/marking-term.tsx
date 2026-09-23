import { teacherMarks } from '@/db/collections/teaching'
import { useHeld } from '@/db/live'
import { termFromResults } from './term'

/**
 * The term above the teacher's sidebar nav.
 *
 * A teaching login cannot read the school calendar — `/settings`, `/sessions`
 * and `/semesters` all answer "restricted to administrators" — so this is the
 * same answer the score sheet files into: the term on the newest mark this
 * teacher has. Read off the same set the score sheet reads (`teacherMarks`),
 * which is what keeps the two agreeing — a wire read here used to vanish
 * offline while the sheet beside it still answered, which is the moment a
 * teacher most needs to know which term they are filing into.
 */
export function MarkingTerm() {
  const marks = useHeld(teacherMarks)
  const term = termFromResults(marks.rows)
  // Nothing rather than a guess: a teacher who has never marked has no term to
  // show, and the score sheet says so where it matters.
  if (!term) return null

  return (
    <div className="mx-4 mb-4 rounded-lg bg-ui-field px-4 py-3">
      <div className="text-2xs uppercase tracking-label text-muted-foreground">
        Marking for
      </div>
      <div className="mt-1 font-heading text-sm font-extrabold">{term.label}</div>
    </div>
  )
}
