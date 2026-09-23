/**
 * The two things every portal has to know to read an invoice: what the API
 * calls a settled one, and how it writes an amount.
 */

/**
 * The API's own word for a settled invoice. It answers `success` for a bill
 * that has been paid and `Unpaid` for one still owing — two vocabularies in
 * one column, and only the first needs translating.
 */
export const SETTLED = 'success'

/** Reads a named string off one of the relations the API expands. */
export function named(record: Record<string, unknown> | undefined, key: string): string {
  const value = record?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** The API sends money as a string; anything unreadable is nothing owed. */
export function money(amount: string | number | null | undefined): number {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}
