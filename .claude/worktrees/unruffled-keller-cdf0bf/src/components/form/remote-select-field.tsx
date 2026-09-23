import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { type FieldValues, type Path, useFormContext, useWatch } from 'react-hook-form'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { OptionsKey } from '@/features/collections/options'
import type { FieldSpan } from './field-shell'
import { SelectField } from './select-field'

/**
 * A select whose choices come from the API rather than the definition — the
 * school's own classes, arms and guardians.
 *
 * `dependsOn` names another field this feed is scoped by: arms belong to a
 * class, so the list stays shut until one is picked, and anything already
 * chosen is cleared when the class changes under it.
 */
export function RemoteSelectField<TValues extends FieldValues>({
  name,
  label,
  from,
  dependsOn,
  hint,
  required,
  span,
}: {
  name: Path<TValues>
  label: string
  from: OptionsKey
  dependsOn?: Path<TValues>
  hint?: string
  required?: boolean
  span?: FieldSpan
}) {
  const { control, setValue, getValues } = useFormContext<TValues>()
  const watched = useWatch({ control, name: dependsOn ?? name, disabled: !dependsOn })
  const scope = dependsOn ? String(watched ?? '') : ''

  const waiting = Boolean(dependsOn) && !scope
  const { data, isPending, isError } = useQuery({
    ...optionsQuery(from, scope),
    enabled: !waiting,
  })

  const chosen = String(getValues(name) ?? '')
  // Read off the loaded feed rather than by watching for a change: an arm that
  // is not one of this class's arms is not a choice, however it got there. An
  // existing record keeps its arm, because that arm is in the list.
  const stale = Boolean(chosen) && (waiting || (data ? !data.some((option) => option.value === chosen) : false))
  useEffect(() => {
    if (stale) setValue(name, '' as never)
  }, [stale, name, setValue])

  const options = data ?? []

  return (
    <SelectField<TValues>
      name={name}
      label={label}
      hint={hint}
      required={required}
      span={span}
      options={options}
      disabled={waiting || isPending}
      placeholder={placeholderFor({
        from,
        waiting,
        isPending,
        isError,
        empty: options.length === 0,
      })}
    />
  )
}

/**
 * What a scoped feed says while it waits. Keyed by the feed, since only a feed
 * that names a scope has anything to wait for; one that is not listed falls
 * back to the ordinary placeholder rather than naming the wrong field.
 */
const WAITING_FOR: Partial<Record<OptionsKey, string>> = {
  arms: 'Pick a class first',
  states: 'Pick a country first',
}

function placeholderFor({
  from,
  waiting,
  isPending,
  isError,
  empty,
}: {
  from: OptionsKey
  waiting: boolean
  isPending: boolean
  isError: boolean
  empty: boolean
}) {
  if (waiting) return WAITING_FOR[from] ?? 'Choose one'
  if (isPending) return 'Loading…'
  if (isError) return 'Could not load these'
  if (empty) return 'Nothing to choose from'
  return 'Choose one'
}
