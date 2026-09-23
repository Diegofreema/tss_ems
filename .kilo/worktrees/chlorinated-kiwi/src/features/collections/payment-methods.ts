import type { Option } from './options.ts'
import { BLANK } from './blank.ts'

/**
 * The school's word for a payment method.
 *
 * `/collect-fees/payment-methods` is the only place these are named — the
 * records themselves carry keys like `bank_transfer` — so a method taken
 * before that list has loaded, or one the API grows later, is shown as it was
 * sent rather than dropped.
 */
export function methodLabel(
  method: string | null | undefined,
  methods?: Record<string, string>,
): string {
  const key = method?.trim()
  if (!key) return BLANK
  return methods?.[key] ?? key
}

/** The methods as a select reads them, in the order the API listed them. */
export function methodOptions(methods: Record<string, string>): Option[] {
  return Object.entries(methods).map(([value, label]) => ({ value, label }))
}
