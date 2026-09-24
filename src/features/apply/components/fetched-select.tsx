import { RotateCw } from 'lucide-react'
import { useEffect } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { FieldShell, type FieldSpan } from '@/components/form/field-shell'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Option } from '@/features/collections/options'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { LABELS, type ApplicationField, type ApplicationValues } from '../schema'

/** What the field reads off a list query — a subset, so a query that answers more than a list can pass its list alone. */
export type FetchedList = {
  data?: readonly Option[]
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  refetch: () => unknown
}

/**
 * A dropdown filled from one of the school's public lists — the class, the
 * country, the state, the LGA.
 *
 * Not the plain `SelectField`, because a fetched list has more to say than a
 * written one: that the list it hangs off has not been chosen yet ("Choose a
 * state first"), that it is on its way, and that it could not be fetched —
 * with a retry beside it, never an empty box, which to somebody on one bar of
 * signal reads as "there is nothing to choose".
 *
 * **A choice that is not in the list is cleared**, read off the loaded list
 * rather than by watching the parent change — the same rule the office's
 * `RemoteSelectField` follows. One check covers every way a stale choice
 * arrives: a state left behind when the country changes, an LGA left behind
 * by the state, and a draft restored after the list it was chosen from moved.
 */
export function FetchedSelect({
  name,
  list,
  waitingFor,
  required,
  span,
  hint,
}: {
  name: ApplicationField
  list: FetchedList
  /** Set while the list this one hangs off is unanswered: "Choose a state first". */
  waitingFor?: string
  required?: boolean
  span?: FieldSpan
  hint?: string
}) {
  const { control, setValue } = useFormContext<ApplicationValues>()
  const { field, fieldState } = useController({ control, name })
  const chosen = typeof field.value === 'string' ? field.value : ''

  const stale =
    Boolean(chosen) &&
    (Boolean(waitingFor) || (list.data ? !list.data.some((option) => option.value === chosen) : false))
  useEffect(() => {
    if (stale) setValue(name, '' as never)
  }, [stale, name, setValue])

  const placeholder = waitingFor
    ? waitingFor
    : list.isPending
      ? 'Loading…'
      : list.isError
        ? 'Could not load this list'
        : !list.data?.length
          ? 'Nothing to choose from'
          : 'Choose one'

  return (
    <FieldShell
      name={name}
      label={LABELS[name]}
      required={required}
      span={span}
      error={fieldState.error?.message}
      hint={list.isError && !waitingFor ? errorMessage(list.error, OFFLINE_MESSAGE) : hint}
    >
      <div className="flex gap-2">
        <Select
          value={chosen}
          onValueChange={field.onChange}
          disabled={Boolean(waitingFor) || !list.data?.length}
        >
          <SelectTrigger
            id={name}
            className="w-full"
            aria-invalid={Boolean(fieldState.error)}
            onBlur={field.onBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {list.data?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {list.isError && !waitingFor && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Try loading ${LABELS[name].toLowerCase()} again`}
            pending={list.isFetching}
            onClick={() => void list.refetch()}
          >
            {!list.isFetching && <RotateCw className="size-4" />}
          </Button>
        )}
      </div>
    </FieldShell>
  )
}
