import { formatDate } from '../../lib/format.ts'

/**
 * A date as an endpoint wants it. Written off the calendar's own year, month
 * and day rather than through `toISOString`, which would send the day before
 * for a date picked anywhere east of Greenwich.
 */
export function toApiDate(date: Date | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** The same date back off the query string, as the calendar holds it. */
export function fromApiDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * What the control reads once a range is set. Either end may stand alone —
 * both endpoints treat a half range as open at the other end — and the label
 * says which end it is rather than leaving a dangling dash.
 */
export function rangeLabel(from: string, to: string): string {
  const start = fromApiDate(from)
  const end = fromApiDate(to)
  if (start && end) {
    return start.getTime() === end.getTime()
      ? formatDate(start)
      : `${formatDate(start)} — ${formatDate(end)}`
  }
  if (start) return `From ${formatDate(start)}`
  if (end) return `Until ${formatDate(end)}`
  return ''
}
