import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FieldShell, type FieldSpan } from './field-shell'

/**
 * A file picked off the machine, held on the form as the `File` itself so the
 * multipart body can append it unchanged.
 *
 * A file input's value cannot be set from code — the browser refuses, since a
 * page that could write one could read any path it liked. So this one is
 * uncontrolled by necessity: it never reads `field.value` back, which also
 * means an edit form opens with nothing chosen even where the record already
 * carries a file. The hint is where that belongs.
 */
export function FileField<TValues extends FieldValues>({
  name,
  label,
  accept,
  hint,
  required,
  span,
}: {
  name: Path<TValues>
  label: string
  /** The `accept` attribute — narrows the picker to what the endpoint takes. */
  accept?: string
  hint?: string
  required?: boolean
  span?: FieldSpan
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      span={span}
    >
      <Input
        {...field}
        id={name}
        type="file"
        accept={accept}
        className="h-auto py-1.5"
        aria-invalid={Boolean(error)}
        // Undefined, never the held `File`: a file input's value is the
        // browser's to set, and React warns on any attempt to control it.
        value={undefined}
        onChange={(event) => field.onChange(event.target.files?.[0])}
      />
    </FieldShell>
  )
}
