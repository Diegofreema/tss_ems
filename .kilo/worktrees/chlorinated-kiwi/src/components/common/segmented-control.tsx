import { cn } from '@/lib/utils'
import { SEGMENTED_FILL, type SegmentedTone } from './segmented-tone'

export type { SegmentedTone }

export type SegmentedOption<TValue extends string> = {
  value: TValue
  label: string
  /** The fill when this one is chosen. Brand where it is not said. */
  tone?: SegmentedTone
}

/**
 * The design system's `.seg` — a bordered row of options with 1px dividers,
 * the selected one filled. Accent unless an option names its own tone. Radio
 * inputs keep it keyboard- and screen-reader-navigable.
 *
 * **Colour is never the only signal**: the chosen option is the filled one
 * whatever its tone, and the radio behind it is what a screen reader reads, so
 * a teacher who cannot tell green from amber still sees which word is set.
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
              ? SEGMENTED_FILL[option.tone ?? 'accent']
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
