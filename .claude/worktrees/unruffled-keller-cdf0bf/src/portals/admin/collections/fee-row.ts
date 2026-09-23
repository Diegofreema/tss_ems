import type { Fee, FeeBody, FeeType } from '../../../api/fees/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { formatNaira } from '../../../lib/format.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** The API sends the amount as an integer; anything unreadable is nothing. */
function money(amount: string | number | null | undefined): number {
  const parsed = Number(amount)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * The two words `feetype` takes, as the office would say them. A fee is
 * charged either to pupils on the register or to people who are not on it yet
 * — applicants paying for a form, say.
 */
const CHARGE: Record<FeeType, string> = {
  enrolled: 'Enrolled pupils',
  none_enrolled: 'Not yet enrolled',
}

export function feeCharge(feetype: string | null | undefined): string {
  return CHARGE[feetype as FeeType] ?? text(feetype)
}

/** The choices the form offers, keyed as the endpoint keys them. */
export const CHARGE_OPTIONS = [
  { value: 'enrolled', label: CHARGE.enrolled },
  { value: 'none_enrolled', label: CHARGE.none_enrolled },
] as const

/**
 * Retiring a fee is a switch, not an edit, and it has its own two endpoints.
 * The button offers whichever state the fee is not in, and says so in the past
 * tense once the API has taken it.
 */
export function activateAction(status: string): {
  label: string
  activate: boolean
  done: string
} {
  return status === 'Active'
    ? { label: 'Deactivate', activate: false, done: 'deactivated' }
    : { label: 'Activate', activate: true, done: 'activated' }
}

/** The ids a fee is currently allocated to, for the flow that changes them. */
export function allocatedTo(fee: Fee): string[] {
  return (fee.departments ?? []).map((department) => String(department.id))
}

/**
 * One line of the fee catalogue.
 *
 * `classes` reads blank in the table on purpose: only `GET /fees/{id}` expands
 * what a fee is allocated to, so the register would show an empty column on
 * every row. It is on the record panel, where the API does answer for it.
 */
export function feeRow(fee: Fee): Row {
  const allocated = fee.departments ?? []

  return {
    id: String(fee.id),
    name: text(fee.name),
    code: text(fee.itemcode),
    charge: feeCharge(fee.feetype),
    amount: formatNaira(money(fee.amount)),
    // `is_active` and `status` say the same thing; the boolean is the one the
    // API computes, and the number is what an older payload carries.
    status: (fee.is_active ?? fee.status === 1) ? 'Active' : 'Inactive',

    // Read by the record panel rather than the table.
    classes: allocated.length
      ? allocated.map((department) => department.name).join(', ')
      : 'Not allocated',
    levels: fee.levels?.length ? fee.levels.map((level) => level.name).join(', ') : BLANK,
    remita: text(fee.remitaitemcode),
    author: text(fee.created_by),
    starts: text(fee.startdate),
    ends: text(fee.enddate),

    // The allocate flow opens with these ticked, so unticking one is how a
    // class is dropped. Ids rather than names, since that is what it posts.
    classIds: allocatedTo(fee).join(','),

    // The edit form is keyed as the endpoint is and prefills from here.
    feetype: fee.feetype ?? '',
    itemcode: fee.itemcode ?? '',
    figure: String(money(fee.amount)),
  }
}

/** The form's values, all strings from the inputs and selects. */
export type FormValues = Record<string, unknown>

function words(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The fee form as `POST /fees` wants it.
 *
 * The amount goes as typed — the endpoint takes "30,000" and "30000.00" alike
 * and normalises it — and `departments` is left out entirely, because passing
 * it replaces the whole allocation and this form never asks about it. The
 * allocate flow is where that set is changed.
 */
export function feeBody(values: FormValues): FeeBody {
  const itemcode = words(values.itemcode)
  return {
    name: words(values.name),
    amount: words(values.figure),
    feetype: (words(values.feetype) || 'enrolled') as FeeType,
    ...(itemcode ? { itemcode } : {}),
  }
}
