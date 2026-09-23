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

/** A noun at the start of a sentence — "Spending deleted", not "spending". */
export const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
export const formatCount = (value: number) => COUNT.format(value)
/**
 * Kobo only when there are kobo: whole-naira fees read "₦30,000" as the design
 * has them, and a spending of 25,000.50 is not rounded away to "₦25,001".
 */
export const formatNaira = (amount: number) =>
  (Number.isInteger(amount) ? NAIRA : NAIRA_KOBO).format(amount)

/** Pulls the figure out of a display string like "₦120,000". */
export function parseNaira(display: string): number {
  return Number.parseInt(display.replace(/[^0-9]/g, ''), 10) || 0
}
