import type { PageParams } from '../types.ts'

/**
 * The counter's own view of an invoice. Deliberately not the `/invoices`
 * shape: this endpoint flattens what that one expands — `fee` and `session`
 * arrive as names, `amount` as a number, and the pupil as the four things a
 * bursary counter needs to be sure it has the right family.
 */
export type CollectInvoice = {
  id: number
  student_id: number
  /** Null where the pupil record behind the invoice has since gone. */
  student: CollectStudent | null
  fee: string | null
  session: string | null
  amount: number
  /** "Unpaid" until settled, then "success" — the gateway's word, not ours. */
  paystatus: string
  is_settled: boolean
  payday: string | null
  createdate: string
  /** Present on one invoice and on a pupil's ledger; absent from the queue. */
  transactions?: Transaction[]
}

/**
 * Two spellings in the wild: the queue and the report name the pupil whole,
 * a pupil's own ledger sends the parts. Both carry the registration number,
 * which is what a counter actually checks.
 */
export type CollectStudent = {
  id: number
  regno: string | null
  name?: string | null
  fname?: string | null
  lname?: string | null
  department: string | null
  class_arm?: string | null
  /** Sent by the search endpoint and null for everyone on it so far. */
  studentstatus?: string | null
}

/** One payment taken against an invoice. Money already collected. */
export type Transaction = {
  id: number
  /** "MANUAL_BANK_TRANSFER_20260827125613_1" — the API mints it. */
  payref: string
  amount: number
  discount: number
  paystatus: string
  method: string
  notes: string | null
  recorded_by: number
  /** A string everywhere but the pay response, which sends the parts. */
  transdate: string | { date: string }
  invoice_id: number
}

/** The three figures over the queue, counted by the API rather than by us. */
export type CollectStats = {
  unpaid_invoices: number
  paid_invoices: number
  outstanding_amount: number
}

export type OutstandingParams = PageParams & {
  /** Matches a pupil's name or registration number. */
  q?: string
}

/** `q` is required — this is a search box, not a list. */
export type FindStudentParams = {
  q: string
  limit?: number
}

export type StudentLedger = {
  student: CollectStudent
  invoices: CollectInvoice[]
}

/**
 * Settles the invoice with no gateway involved. `amount + discount` must equal
 * the invoice exactly, so the amount is derived from the discount rather than
 * typed; an already-settled invoice is refused with 409.
 */
export type TakePaymentBody = {
  /** Accepts "24,000" as readily as "24000". */
  amount: string
  discount?: number
  payment_method: string
  notes?: string
}

export type PaymentTaken = {
  invoice: CollectInvoice
  transaction: Transaction
}

/** Dates default to the current month and are swapped if given backwards. */
export type CollectionsReportParams = {
  start_date?: string
  end_date?: string
  payment_method?: string
}

export type MethodTotals = {
  amount: number
  discount: number
  entries: number
}

/** A payment in the report carries the pupil and fee the queue would show. */
export type ReportPayment = Transaction & {
  student: CollectStudent | null
  fee: string | null
}

export type CollectionsReport = {
  range: { from: string; to: string; payment_method: string | null }
  totals: MethodTotals
  /** Keyed by method — every method, including the ones with no entries. */
  by_method: Record<string, MethodTotals>
  payments: ReportPayment[]
}

/**
 * A counter receipt, as the endpoint issues it. Only ever against a recorded
 * transaction — an invoice settled before the counter existed is settled with
 * no payment behind it, and asking for its receipt is a 404.
 *
 * `amount` is what was handed over and `total_settled` what the invoice was
 * closed for; they differ by the discount granted.
 */
export type Receipt = {
  reference: string
  issued_at: string
  /** The school's own name, for the head of the slip. */
  school: string | null
  session: string | null
  fee: string | null
  amount: number
  discount: number
  total_settled: number
  method: string
  notes: string | null
  student: CollectStudent | null
}

/** The slip and the invoice it closes, which the endpoint sends together. */
export type ReceiptIssued = {
  receipt: Receipt
  invoice: CollectInvoice
}
