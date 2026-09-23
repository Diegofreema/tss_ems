import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { hasText } from '@/features/collections/rich-text'
import { FieldShell, type FieldSpan } from './field-shell'

/**
 * A rich-text field on a record form.
 *
 * An emptied editor is stored as the empty string rather than as the `<p></p>`
 * it hands back, so a required body is refused by the same `min(1)` every
 * other field is checked with instead of needing a rule of its own.
 */
export function RichTextField<TValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  span,
  placeholder,
}: {
  name: Path<TValues>
  label: string
  hint?: string
  required?: boolean
  span?: FieldSpan
  placeholder?: string
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
      <RichTextEditor
        id={name}
        value={typeof field.value === 'string' ? field.value : ''}
        onChange={(html) => field.onChange(hasText(html) ? html : '')}
        onBlur={field.onBlur}
        placeholder={placeholder}
        invalid={Boolean(error)}
      />
    </FieldShell>
  )
}
