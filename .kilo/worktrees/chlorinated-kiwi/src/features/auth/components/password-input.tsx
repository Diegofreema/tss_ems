import { useState } from 'react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { FieldShell } from '@/components/form/field-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** A password field with the design's Show/Hide button beside it. */
export function PasswordInput<TValues extends FieldValues>({
  name,
  label,
  hint,
  placeholder,
  required = true,
  visible,
  onToggle,
}: {
  name: Path<TValues>
  label: string
  hint?: string
  placeholder?: string
  required?: boolean
  /**
   * Omit and the field owns its own Show/Hide button. Pass it to share one
   * toggle down a group of fields, as the design does for a new password and
   * its repeat — only the field that also passes `onToggle` draws the button.
   */
  visible?: boolean
  onToggle?: () => void
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const [ownVisible, setOwnVisible] = useState(false)
  const error = fieldState.error?.message

  const shown = visible ?? ownVisible
  const withButton = visible === undefined || onToggle !== undefined
  const toggle = onToggle ?? (() => setOwnVisible((previous) => !previous))

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="flex gap-2">
        <Input
          {...field}
          id={name}
          value={field.value ?? ''}
          type={shown ? 'text' : 'password'}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className="flex-1"
        />
        {withButton && (
          <Button
            type="button"
            variant="outline"
            className="flex-none"
            onClick={toggle}
          >
            {shown ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>
    </FieldShell>
  )
}
