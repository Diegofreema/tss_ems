import { cn } from '@/lib/utils'

export type SegmentedOption<TValue extends string> = {
  value: TValue
  label: string
}

/**
 * The design system's `.seg` — a bordered row of options with 1px dividers,
 * the selected one filled with accent. Radio inputs keep it keyboard- and
 * screen-reader-navigable.
 */
export function SegmentedControl<TValue extends string>({
  name,
  options,
  value,
  onChange,
  className,
}: {
  name: string
  options: readonly SegmentedOption<TValue>[]
  value: TValue
  onChange: (value: TValue) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex overflow-hidden rounded-md border border-divider', className)}>
      {options.map((option) => (
        <label
          key={option.value}
          data-slot="seg-option"
          className={cn(
            'relative inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.75 text-sm transition-colors',
            'border-l border-divider first:border-l-0',
            'has-[:focus-visible]:outline has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-brand',
            option.value === value
              ? 'bg-brand text-white'
              : 'hover:bg-foreground/7',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="pointer-events-none absolute size-0 opacity-0"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
