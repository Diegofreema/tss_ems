import { cn } from '@/lib/utils'

/** One square per question: filled when answered, outlined when it is current. */
export function QuestionPips({
  count,
  current,
  answered,
  onJump,
}: {
  count: number
  current: number
  answered: (index: number) => boolean
  onJump: (index: number) => void
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-1">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onJump(index)}
          aria-label={`Question ${index + 1}${answered(index) ? ', answered' : ''}`}
          aria-current={index === current ? 'true' : undefined}
          className={cn(
            'size-[34px] flex-none border-2 font-heading text-xs font-extrabold transition-colors',
            index === current ? 'border-foreground' : 'border-divider',
            answered(index)
              ? 'bg-brand text-white'
              : 'bg-transparent text-foreground',
          )}
        >
          {index + 1}
        </button>
      ))}
    </div>
  )
}
