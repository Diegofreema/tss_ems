import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { fromApiDate, rangeLabel, toApiDate } from '../date-range'
import { cn } from '@/lib/utils'
import type { FilterSpec } from '../types'

// ponytail: ten years is a guess at how far any of these ledgers go back —
// far enough that nobody hits the bound, near enough that the year dropdown
// is not a hundred rows of years the school did not exist for. Widen it if a
// register ever needs more.
const LEDGER_YEARS = 10

/**
 * A date range beside the search box, over two query parameters.
 *
 * One picker rather than two date fields: react-day-picker's range mode cannot
 * produce a range the wrong way round, and the ledger endpoint answers a
 * backwards range with nothing at all rather than swapping it.
 */
export function FilterDateRange({
  spec,
  from,
  to,
  onChange,
}: {
  spec: FilterSpec
  from: string
  to: string
  onChange: (values: Record<string, string>) => void
}) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const start = new Date(today.getFullYear() - LEDGER_YEARS, 0)
  const selected: DateRange | undefined = fromApiDate(from)
    ? { from: fromApiDate(from), to: fromApiDate(to) }
    : undefined
  const set = (range: DateRange | undefined) =>
    onChange({
      [spec.key]: toApiDate(range?.from) ?? '',
      [spec.until!]: toApiDate(range?.to) ?? '',
    })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={spec.label}
          className={cn(
            'h-8 justify-between gap-2 px-2.5 font-body text-sm font-normal',
            !selected && 'text-muted-foreground',
          )}
        >
          {rangeLabel(from, to) || spec.label}
          <CalendarIcon className="size-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          defaultMonth={selected?.from}
          // A ledger records what has happened, so the years read backwards
          // and there is nothing ahead of today to pick.
          startMonth={start}
          endMonth={today}
          captionLayout="dropdown"
          reverseYears
          numberOfMonths={2}
          // A range already set is replaced rather than stretched. Left to
          // itself the picker treats a click inside a chosen range as
          // dragging one of its ends, so picking 26 and 28 inside an
          // existing August would leave the 1st as the start.
          onSelect={(range, day) =>
            selected?.from && selected?.to ? set({ from: day, to: undefined }) : set(range)
          }
          autoFocus
        />
        {/* Clearing has to be its own control: unpicking a range by clicking
            the same two days back off is not something anyone will find. */}
        <div className="flex justify-end border-t-2 border-divider p-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!from && !to}
            onClick={() => {
              set(undefined)
              setOpen(false)
            }}
          >
            Clear dates
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
