import type { Spending, SpendingBody, SpendingMonth } from '../../../api/spendings/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'
import { formatNaira } from '../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** The amount as the API sends it — a decimal string — as a number. */
function figure(amount: number | string | null | undefined): number {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Who spent it, as the ledger names people: an initial and a surname. The
 * account is shown instead where the entry outlived the person's record —
 * which is exactly when a ledger line needs attributing.
 */
function recordedBy(spending: Spending): string {
  const user = spending.user
  const surname = user?.lname?.trim()
  const initial = user?.fname?.trim().charAt(0)
  if (surname) return initial ? `${initial}. ${surname}` : surname
  return user?.username?.trim() || (spending.user_id ? `User ${spending.user_id}` : BLANK)
}

/**
 * One line of the expenditure ledger.
 *
 * The endpoint holds no category and no entry date of its own — it stamps
 * `datecreated` itself and attributes the entry to the token that sent it — so
 * the register shows the four things a spending actually is.
 *
 * `spent` is the amount written the way money reads and `amount` is the figure
 * itself, keyed as the endpoint keys it — the edit form prefills from that one,
 * since its numeric field would refuse a naira sign.
 */
export function spendingRow(spending: Spending): Row {
  return {
    id: String(spending.id),
    date: when(spending.datecreated, false),
    description: text(spending.description),
    spent: formatNaira(figure(spending.amount)),
    by: recordedBy(spending),

    // Read by the record panel and the edit form rather than the table.
    when: when(spending.datecreated, true),
    account: text(spending.user?.username),
    amount: String(figure(spending.amount)),
  }
}

/** The form's values, all strings from the inputs. */
export type FormValues = Record<string, unknown>

/**
 * The spending form as `POST /spendings` wants it. The amount is typed the way
 * money reads — "412,000" — and the endpoint refuses anything but a number, so
 * the separators come off here rather than at the field.
 */
export function spendingBody(values: FormValues): SpendingBody {
  return {
    amount: Number(String(values.amount ?? '').replace(/[^0-9.]/g, '')) || 0,
    description: String(values.description ?? '').trim(),
  }
}

/**
 * The month `YYYY-MM` the summary would file today under. Read off the
 * reader's clock, which is the school's.
 */
export function monthKey(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

/** What the summary says about one month; a month with nothing in it is zero. */
export function spentIn(months: SpendingMonth[], key: string): SpendingMonth {
  return months.find((month) => month.month === key) ?? { month: key, total: 0, entries: 0 }
}

/** Everything spent in the months belonging to a year, e.g. "2026". */
export function spentInYear(months: SpendingMonth[], year: string): number {
  return months
    .filter((month) => month.month?.startsWith(`${year}-`))
    .reduce((total, month) => total + (Number(month.total) || 0), 0)
}
