import type { PageParams } from '../types.ts'

export type Invoice = {
  id: number
  fee_id: number | null
  student_id: number
  session_id: number | null
  /** Amounts come back as strings from this API. */
  amount: string
  paystatus: string
  /** The human reference printed on the invoice, e.g. `TSS1/16`. */
  invoiceid: string | null
  createdate: string
  payday: string | null
  student?: Record<string, unknown>
  fee?: Record<string, unknown>
  /** The session the invoice was raised under, expanded by list and detail. */
  session?: Record<string, unknown>
  /** Set when the student's row has since been deleted. */
  student_missing?: boolean
}

export type InvoiceListParams = PageParams & {
  fee_id?: number
  status?: string
  /** Each bound applies on its own, so a single-sided range works. */
  startdate?: string
  enddate?: string
}

/**
 * Only `amount` is actually required — `POST /invoices` accepts a body with
 * nothing else in it. The rest are required here because an invoice nobody
 * can bill is not worth raising; `session_id` is the exception, since the
 * school may not have a current session set.
 */
export type InvoiceBody = {
  fee_id: number
  student_id: number
  amount: string
  session_id?: number
  paystatus?: string
  invoiceid?: string
}

/**
 * Marks the invoice paid and closes its transaction. The student is named so a
 * mistyped invoice number cannot settle someone else's bill.
 */
export type SettleInvoiceBody = {
  student_id: number
}

export type Payment = Record<string, unknown>
