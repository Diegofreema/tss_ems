import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldShell, type FieldSpan } from './field-shell'

type TextFieldProps<TValues extends FieldValues> = {
  name: Path<TValues>
  label: string
  hint?: string
  required?: boolean
  span?: FieldSpan
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'time'
  /** Bounds for a number control, so the stepper stops where the rule does. */
  min?: number
  max?: number
  multiline?: boolean
}

export function TextField<TValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  span,
  placeholder,
  type = 'text',
  min,
  max,
  multiline,
}: TextFieldProps<TValues>) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message
  const Control = multiline ? Textarea : Input

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      span={span}
    >
      <Control
        {...field}
        id={name}
        value={field.value ?? ''}
        type={multiline ? undefined : type}
        min={min}
        max={max}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
    </FieldShell>
  )
}
