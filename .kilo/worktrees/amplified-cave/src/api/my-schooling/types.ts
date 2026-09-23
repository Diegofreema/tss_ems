import type { Invoice } from '../invoices/types.ts'
import type { Student } from '../students/types.ts'

export type { Student }

/**
 * Contact details only. regno, class, level, session, status and application
 * number are refused, so a student cannot move class, re-admit themselves or
 * lift a suspension.
 */
export type UpdateMyRecordBody = {
  phone?: string
  address?: string
}

/**
 * `GET /students/me/dashboard` — five counters and nothing else. The unpaid
 * count is the only place a student can read what they still owe: the invoice
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
 * One payment against one of the student's invoices — the receipt trail the
 * bursary writes as it takes the money. `discount` and the office's own note
 * are on it, and both are the student's own business to read.
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
 * One file a teacher has shared with the student's class, as
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
 * One subject the student is registered for, as `GET /students/me/courses`
 * sends it. Probed 2026-08-31 as student 4, who is registered for five.
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
 * session and a term, and the endpoint says which — the student's own class is
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

/**
 * A topic a teacher has written up for one of the student's subjects, off
 * `GET /students/me/content` — read off bronze 2026-09-16.
 *
 * The same scheme of work the teacher files under "Topics taught", turned
 * round: there it is filtered by the teacher who wrote it, here by the subject
 * the child takes.
 *
 * Three things about the shape are worth knowing before drawing it.
 * `contents` is **HTML**, and not always HTML this app produced — one live
 * topic is a table pasted out of Word, `MsoNormalTable` and all — so it goes
 * through `RichTextView`, which parses against the editor's own schema rather
 * than setting it on an element. `posted` is a **US-locale display string**
 * ("9/16/26, 8:21 AM"), not a timestamp, which is the same shape `opendate`
 * arrived in and the same trap: parsed as ISO it is blank. And `kind` is
 * `"topic"` on every row, which reads like a merged feed waiting to happen —
 * materials come back in their own array today.
 */
export type TopicPost = {
  id: number
  /** `"topic"` on every row seen. */
  kind?: string | null
  title?: string | null
  subject_id?: number | null
  /** The subject's name, resolved beside the id. */
  subject?: string | null
  /** Who wrote it up, as one string. */
  teacher?: string | null
  /** HTML, and not always this app's HTML. */
  contents?: string | null
  /** `"9/16/26, 8:21 AM"` — the school's wall clock, already formatted. */
  posted?: string | null
  updated?: string | null
}

/**
 * What teachers have put up for the subjects the student takes, off
 * `GET /students/me/content`.
 *
 * Takes an optional `subject_id`, which narrows `subjects` and `topics` alike.
 * **Nothing here passes it**: the whole set is one small answer, and asked for
 * whole it can be narrowed on the device — which is what lets a subject's
 * topics open in a classroom with no signal, and costs one request rather than
 * one per subject opened. The same reasoning as the teacher's own tab, which
 * filters `GET /teachers/me/topics` locally for the same reason.
 *
 * `materials` is `[]` on every subject this school holds, which is consistent
 * with the materials table having no writer anywhere in the API.
 */
export type StudentContent = {
  subjects?: { id: number; name?: string | null }[] | null
  topics?: TopicPost[] | null
  /** Empty everywhere so far; typed so the day it fills nothing is surprised. */
  materials?: MyMaterial[] | null
  /** The school's own sentence for an empty answer. */
  message?: string | null
}

export type MyResultParams = {
  session_id?: number
  semester_id?: number
}
