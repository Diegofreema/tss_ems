/**
 * The endpoint's own caps: `POST /teachers/me/scores` refuses a CA above 40 or
 * an exam above 60. The design drew 30 and 70; the API is what marks are
 * actually filed against, so it is what the sheet enforces.
 */
export const CA_MAX = 40
export const EXAM_MAX = 60

/** Blank and non-numeric entries count as zero, exactly as the sheet shows. */
export function markOf(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function totalOf(ca: string, exam: string): number {
  return markOf(ca) + markOf(exam)
}

export function sheetAverage(totals: number[]): number {
  if (totals.length === 0) return 0
  const sum = totals.reduce((running, total) => running + total, 0)
  return Math.round(sum / totals.length)
}
