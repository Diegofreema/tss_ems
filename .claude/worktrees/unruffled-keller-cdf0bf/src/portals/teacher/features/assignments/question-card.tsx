import { Check } from 'lucide-react'
import type { AssignmentQuestion } from '@/api/set-assignments/types'
import { Tag } from '@/components/common/tag'
import { Button } from '@/components/ui/button'
import { isTheory, typeLabel } from './question'

/**
 * One written question, as the teacher reads it back.
 *
 * The answer is shown, not hidden: this is the page where it is decided, and an
 * assignment whose key can only be checked by opening every question one at a time
 * is an assignment nobody proof-reads. The pupil's own copy never carries it.
 */
export function QuestionCard({
  question,
  position,
  onEdit,
  onDelete,
}: {
  question: AssignmentQuestion
  position: number
  onEdit: () => void
  onDelete: () => void
}) {
  const points = question.points ?? 0

  return (
    <li className="animate-ems-up border-2 border-divider p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-heading text-sm font-extrabold tabular-nums text-muted-foreground">
            {position}.
          </span>
          <div>
            <p className="text-sm">
              {question.question_text?.trim() || 'This question has no wording yet'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag>{typeLabel(question.question_type)}</Tag>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {points} point{points === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {isTheory(question) ? (
        <p className="mt-3 pl-7 text-[11px] text-muted-foreground">
          Marked by hand once the assignment is sat.
        </p>
      ) : (
        <ul className="mt-3 grid gap-1 pl-7">
          {(question.options ?? []).map((option, index) => (
            <li
              key={option.id ?? index}
              className="flex items-center gap-2 text-[13px]"
            >
              {option.is_correct ? (
                <Check className="size-3.5 text-brand" aria-label="The right answer" />
              ) : (
                <span className="size-3.5" />
              )}
              <span className={option.is_correct ? 'text-foreground' : 'text-muted-foreground'}>
                {option.option_text?.trim() || '—'}
              </span>
            </li>
          ))}
          {!question.options?.length && (
            <li className="text-[11px] text-brand-700">
              This question offers no choices, so no pupil can answer it.
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
