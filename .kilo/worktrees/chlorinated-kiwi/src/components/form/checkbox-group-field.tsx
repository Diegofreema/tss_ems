import { useQuery } from '@tanstack/react-query'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { OptionsKey } from '@/features/collections/options'
import { cn } from '@/lib/utils'
import { FieldShell, type FieldSpan } from './field-shell'

/**
 * Many of a feed at once — the fees a class is charged, the subjects it is
 * taught.
 *
 * A select cannot say "these four", and the picker the guided flows use is a
 * whole page of its own. This is the field version: the same feeds the selects
 * read, held as an array of the API's own ids.
 */
export function CheckboxGroupField<TValues extends FieldValues>({
  name,
  label,
  from,
  hint,
  required,
  span,
}: {
  name: Path<TValues>
  label: string
  from: OptionsKey
  hint?: string
  required?: boolean
  span?: FieldSpan
}) {
  const { control, getValues } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const { data, isPending, isError } = useQuery(optionsQuery(from, ''))

  const options = data ?? []
  const picked: string[] = field.value ?? []

  // Read the live value rather than this render's, so two taps in quick
  // succession both land.
  const toggle = (value: string) => {
    const current: string[] = getValues(name) ?? []
    field.onChange(
      current.includes(value)
        ? current.filter((one) => one !== value)
        : [...current, value],
    )
  }

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={fieldState.error?.message}
      required={required}
      span={span}
    >
      <div
        role="group"
        aria-labelledby={name}
        aria-invalid={fieldState.error ? true : undefined}
        className={cn(
          'max-h-[220px] overflow-y-auto rounded-md border border-input bg-background',
          fieldState.error && 'border-danger',
        )}
      >
        {options.length === 0 ? (
          <div className="px-3 py-2.5 text-sm text-muted-foreground">
            {isPending
              ? 'Loading…'
              : isError
                ? 'Could not load these'
                : 'Nothing to choose from'}
          </div>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 border-b border-divider px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-neutral-200"
            >
              <Checkbox
                checked={picked.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    </FieldShell>
  )
}
