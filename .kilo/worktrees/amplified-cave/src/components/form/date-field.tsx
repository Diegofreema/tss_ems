import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { FieldShell, type FieldSpan } from './field-shell'

/** A century back covers any date of birth the school will ever record. */
const LIFETIME = 100

/** Far enough ahead for a due date or a session that has not started. */
const AHEAD = 5

/**
 * The years the dropdown offers, and the order to read them in. A date already
 * behind us is listed newest first — a student born in 2014 is three rows down
 * rather than eighty-eight.
 */
function bounds(past: boolean | undefined, today: Date) {
  const year = today.getFullYear()
  return past
    ? { startMonth: new Date(year - LIFETIME, 0), endMonth: today, reverseYears: true }
    : { startMonth: new Date(year - 1, 0), endMonth: new Date(year + AHEAD, 11) }
}

export function DateField<TValues extends FieldValues>({
  name,
  label,
  hint,
  required,
  span,
  past,
  placeholder = 'Pick a date',
}: {
  name: Path<TValues>
  label: string
  hint?: string
  required?: boolean
  span?: FieldSpan
  /** The date being asked for has already happened — a birthday, not a due date. */
  past?: boolean
  placeholder?: string
}) {
  const { control } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const [open, setOpen] = useState(false)
  const error = fieldState.error?.message
  const value = field.value as Date | undefined
  const range = bounds(past, new Date())

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      span={span}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={name}
            type="button"
            variant="outline"
            aria-invalid={Boolean(error)}
            className={cn(
              'h-9 w-full justify-between px-2.5 font-body text-sm font-normal',
              !value && 'text-muted-foreground',
            )}
          >
            {value ? formatDate(value) : placeholder}
            <CalendarIcon className="size-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            // Without this the picker opens on today even when a date is set.
            defaultMonth={value}
            // Month and year as dropdowns rather than a label: a date of birth
            // is otherwise a hundred and fifty presses of the back arrow away.
            captionLayout="dropdown"
            {...range}
            onSelect={(date) => {
              field.onChange(date)
              setOpen(false)
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </FieldShell>
  )
}
