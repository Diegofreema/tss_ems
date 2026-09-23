import type { Invoice } from '../invoices/types.ts'
import type { Student } from '../students/types.ts'

export type { Student }

/**
 * Contact details only. regno, class, level, session, status and application
 * number are refused, so a pupil cannot move class, re-admit themselves or
 * lift a suspension.
 */
export type UpdateMyRecordBody = {
  phone?: string
  address?: string
}

/**
 * `GET /students/me/dashboard` — five counters and nothing else. The unpaid
 * count is the only place a pupil can read what they still owe: the invoice
 * list beside it returns settled bills alone.
 */
export type StudentDashboard = {
  stats?: {
    invoices_total: number
    invoices_unpaid: number
    results_available: number
    materials_available: number
    fees_settled_this_session: number
  }
}

/**
 * One payment against one of the pupil's invoices — the receipt trail the
 * bursary writes as it takes the money. `discount` and the office's own note
 * are on it, and both are the pupil's own business to read.
 */
export type MyPayment = {
  id: number
  invoice_id: number | null
  fee_id: number | null
  session_id: number | null
  /** Money comes back as a string here, as everywhere else on this API. */
  amount: string
  discount: string | null
  paystatus: string
  /** The bursary's reference, e.g. `MANUAL_CASH_20260831083755_1`. */
  payref: string | null
  /** How it was taken — `cash` for money over the counter. */
  pgateway: string | null
  notes: string | null
  transdate: string | null
  fee?: Record<string, unknown>
  session?: Record<string, unknown>
}

/**
 * `GET /students/me/invoices` answers with both halves of the ledger: the
 * bills, and the payments taken against them. It returns settled bills only
 * whatever it is asked — see the dashboard's `invoices_unpaid` for the rest.
 */
export type MyInvoices = {
  invoices: Invoice[]
  transactions: MyPayment[]
}

/**
 * One file a teacher has shared with the pupil's class, as
 * `GET /students/me/materials` would send it.
 *
 * Unverified, and less certain than the result shape beside it. Course
 * materials are their own table — deleting a subject counts `coursematerials`
 * apart from `topics`, `results` and `setassignments` — and nothing in this
 * API writes to it: there is no upload route on a teacher login, an admin
 * login or anywhere else. Every subject in the school reports a count of 0, so
 * the endpoint has only ever answered `{ "materials": [] }` and no second
 * route reads the table to compare against.
 *
 * The fields below are `topics`, the neighbour that table is counted beside
 * and the closest evidence there is of the hand that built it. Every one of
 * them is optional and read defensively, because a shape nobody has seen
 * filled in is a shape worth doubting.
 */
export type MyMaterial = {
  id: number
  subject_id?: number | null
  title?: string | null
  uploaddate?: string | null
  subject?: { id: number; name: string } | null
  department?: { id: number; name: string } | null
}

/**
 * One subject the pupil is registered for, as `GET /students/me/courses`
 * sends it. Probed 2026-08-31 as pupil 4, who is registered for five.
 *
 * This endpoint flattens: `teachers` is an array of **names**, not the
 * `{ id, name }` records `/subjects/{id}` sends, and there is no `department`
 * on the course at all — the class is a sibling of the list, the same one for
 * every row. A subject nobody has been assigned to teach sends `[]`.
 *
 * `creditload` is 0 on every subject the school holds; it is a university
 * field and the school does not use it.
 */
export type MyCourse = {
  id: number
  name?: string | null
  subjectcode?: string | null
  creditload?: number | null
  teachers?: (string | null)[] | null
}

/**
 * The whole answer, not just the list. A registration belongs to a class, a
 * session and a term, and the endpoint says which — the pupil's own class is
 * not the one on their record but the one the registration was made against.
 *
 * `message` is the API's own sentence for an empty list; it is null whenever
 * there is a registration to send.
 */
export type MyCourses = {
  courses?: MyCourse[] | null
  count?: number | null
  class?: { id: number; name?: string | null; arm?: string | null } | null
  session?: { id: number; name?: string | null } | null
  semester?: { id: number; name?: string | null } | null
  message?: string | null
}

export type MyResultParams = {
  session_id?: number
  semester_id?: number
}
