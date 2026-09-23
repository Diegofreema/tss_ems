import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Option } from '@/features/collections/options'
import { FieldShell, type FieldSpan } from './field-shell'

export function SelectField<TValues extends FieldValues>({
  name,
  label,
  options,
  hint,
  required,
  span,
  placeholder,
  disabled,
}: {
  name: Path<TValues>
  label: string
  /** The value is what the form submits; the label is what the school reads. */
  options: readonly Option[]
  hint?: string
  required?: boolean
  span?: FieldSpan
  placeholder?: string
  disabled?: boolean
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
      <Select
        value={field.value ?? ''}
        onValueChange={field.onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={Boolean(error)}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={placeholder ?? 'Choose one'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  )
}
