import { NumericFormat } from 'react-number-format'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { amountInWords } from '@/lib/amount-words'
import { FieldShell, type FieldSpan } from './field-shell'

/**
 * A figure in naira. The mask refuses letters and misplaced separators, so the
 * only thing that can reach the form state is a number; the line beneath spells
 * that number out as it is typed, which is where a slipped digit shows up.
 */
export function MoneyField<TValues extends FieldValues>({
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
  const words = amountInWords(field.value ?? '')

  return (
    <FieldShell
      name={name}
      label={label}
      hint={words || hint}
      error={error}
      required={required}
      span={span}
    >
      <NumericFormat
        customInput={Input}
        id={name}
        name={field.name}
        value={field.value ?? ''}
        getInputRef={field.ref}
        onBlur={field.onBlur}
        // The unformatted figure is what is stored, so the separators never
        // reach the endpoint and an edit prefills without them.
        onValueChange={(values) => field.onChange(values.value)}
        thousandSeparator=","
        decimalScale={2}
        allowNegative={false}
        inputMode="decimal"
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className="tabular-nums"
      />
    </FieldShell>
  )
}
