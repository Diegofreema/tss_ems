import type { QuestionOption } from '@/api/assignments/types'
import { cn } from '@/lib/utils'

const LETTERS = 'ABCDEFGH'

/**
 * A–D answer rows; picking one tints the row and fills its letter square.
 *
 * Keyed and reported by the option's own id rather than its position, because
 * that is what a submission is scored against — an option id belonging to a
 * different question is discarded rather than marked wrong.
 */
export function OptionList({
  options,
  chosen,
  onChoose,
  disabled,
}: {
  options: QuestionOption[]
  chosen?: number
  onChoose: (optionId: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-divider bg-raised">
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(option.id)}
          aria-pressed={option.id === chosen}
          className={cn(
            'flex items-center gap-3.5 border-b border-divider px-4.5 py-4 text-left text-base last:border-b-0',
            'transition-[background-color,padding-left] duration-150',
            disabled
              ? 'cursor-default'
              : 'cursor-pointer hover:bg-neutral-200 hover:pl-5.5',
            option.id === chosen ? 'bg-brand/12' : 'bg-raised',
          )}
        >
          <span
            className={cn(
              'grid size-6.5 flex-none place-items-center rounded-md border font-heading text-xs font-extrabold',
              option.id === chosen
                ? 'border-brand bg-brand text-white'
                : 'border-divider bg-transparent text-foreground',
            )}
          >
            {LETTERS[index] ?? index + 1}
          </span>
          <span className="flex-1">{option.option_text?.trim() || `Option ${index + 1}`}</span>
        </button>
      ))}
    </div>
  )
}
