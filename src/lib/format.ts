/** Display formats shared across the portals. */

const DATE = new Intl.DateTimeFormat('en-NG', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

const NAIRA_KOBO = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const COUNT = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })

export const formatDate = (date: Date) => DATE.format(date)

/**
 * A figure fit to print: anything that is not a finite number is 0.
 *
 * The API types its counters as numbers and does not always send them — a
 * counter missing from `/users/dashboard` arrived as `undefined`, and
 * `Intl.NumberFormat` prints that as "NaN" on the office's home page. A figure
 * the school did not send is drawn as none rather than as a word from the
 * inside of a JavaScript engine. Numeric strings are read, since this API
 * sends money as "12000.00".
 */
export function orZero(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? Number.NaN)
  return Number.isFinite(parsed) ? parsed : 0
}

/** A noun at the start of a sentence — "Spending deleted", not "spending". */
export const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
export const formatCount = (value: number) => COUNT.format(orZero(value))
/**
 * Kobo only when there are kobo: whole-naira fees read "₦30,000" as the design
 * has them, and a spending of 25,000.50 is not rounded away to "₦25,001".
 */
export const formatNaira = (amount: number) => {
  const figure = orZero(amount)
  return (Number.isInteger(figure) ? NAIRA : NAIRA_KOBO).format(figure)
}

/** Pulls the figure out of a display string like "₦120,000". */
export function parseNaira(display: string): number {
  return Number.parseInt(display.replace(/[^0-9]/g, ''), 10) || 0
}
