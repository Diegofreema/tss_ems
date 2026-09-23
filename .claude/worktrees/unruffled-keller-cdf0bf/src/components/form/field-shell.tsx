import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type FieldSpan = 2 | 'full'

/**
 * Label, control and the single line beneath it. That line is the hint until
 * the field fails validation, at which point it becomes the error message and
 * the control's border turns the brand colour.
 */
export function FieldShell({
  name,
  label,
  hint,
  error,
  required,
  span,
  children,
}: {
  name: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  span?: FieldSpan
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'animate-ems-up',
        span === 2 && 'sm:col-span-2',
        span === 'full' && 'col-[1/-1]',
      )}
    >
      <Label
        htmlFor={name}
        className="mb-1.25 block text-xs font-normal text-foreground/70"
      >
        {label}
        {required && <span className="text-brand">*</span>}
      </Label>

      {children}

      {(error ?? hint) && (
        <div
          className={cn(
            'mt-1 text-2xs',
            error ? 'text-danger-ink' : 'text-muted-foreground',
          )}
        >
          {error ?? hint}
        </div>
      )}
    </div>
  )
}
