import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/**
 * A boxed statement the user has to tick before the form can be sent. The line
 * beneath it is the hint until it fails, exactly like `FieldShell`.
 */
export function DeclarationField<TValues extends FieldValues>({
  name,
  statement,
  hint,
}: {
  name: Path<TValues>
  statement: string
  hint: string
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <div className="mt-6 rounded-lg border border-divider p-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-normal">
        <Checkbox
          id={name}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          aria-invalid={Boolean(error)}
          className="mt-0.5 flex-none"
        />
        <span>{statement}</span>
      </label>
      <div
        className={cn(
          'mt-2 text-2xs',
          error ? 'text-danger-ink' : 'text-muted-foreground',
        )}
      >
        {error ?? hint}
      </div>
    </div>
  )
}
