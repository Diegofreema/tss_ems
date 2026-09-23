import { useQuery } from '@tanstack/react-query'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { OptionsKey } from '@/features/collections/options'
import { FieldShell, type FieldSpan } from './field-shell'
import { RemoteSelectField } from './remote-select-field'

/**
 * A field whose answer came with the page — the subject a topic was opened
 * from — shown rather than asked. See `settledValue` in
 * `features/collections/settled.ts` for which fields qualify.
 *
 * The value is the form's exactly as a picker's would be: it is registered,
 * validated and submitted, and only the control is gone. What replaces it is
 * the feed's own label, so the reader sees the subject's name rather than the
 * number the URL carried.
 *
 * **A value the feed cannot name falls back to the picker.** A settled field
 * states a fact, and an id with no row behind it — a hand-typed link, a
 * subject since dropped, a feed that could not be read — is not one. Showing
 * the bare id would be a fact nobody can check; asking again is the honest
 * answer, and it is also the only way back from a link with the wrong id in
 * it.
 */
export function SettledSelectField<TValues extends FieldValues>({
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
  /** Shown only by the picker this falls back to; a settled field says its own. */
  hint?: string
  required?: boolean
  span?: FieldSpan
}) {
  const { control } = useFormContext<TValues>()
  const { field } = useController({ control, name })
  const chosen = String(field.value ?? '')
  const { data, isPending } = useQuery(optionsQuery(from, ''))
  const named = data?.find((option) => option.value === chosen)?.label

  if (!isPending && !named)
    return (
      <RemoteSelectField<TValues>
        name={name}
        label={label}
        from={from}
        hint={hint}
        required={required}
        span={span}
      />
    )

  return (
    <FieldShell
      name={name}
      label={label}
      hint="Chosen by the page you opened this from."
      required={required}
      span={span}
    >
      <div
        id={name}
        className="flex h-11 w-full items-center rounded-lg bg-ui-field px-4 text-[15px] text-foreground"
      >
        {named ?? <span className="text-ui-hint">Loading…</span>}
      </div>
    </FieldShell>
  )
}
