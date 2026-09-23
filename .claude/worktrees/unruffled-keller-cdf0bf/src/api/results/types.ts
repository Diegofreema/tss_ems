import type { PageParams } from '../types.ts'

/**
 * Marks, and the queue they pass through on the way to a family.
 *
 * A mark is one pupil, one subject, one term. A **batch** is one subject for
 * one class in one term, and that is the unit the office signs off: a teacher
 * enters, the office releases, and `POST /results/approve` is a 403 for the
 * teacher who entered the batch. That separation is the point of the
 * controller, which is why release lives in the admin portal alone.
 *
 * Nothing outside the staff room sees a mark until it is approved.
 */

/** Where a mark stands with the office. */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

/**
 * One mark.
 *
 * The field names are not guesses: `first_ca`, `second_ca` and `first_exam`
 * are already visible on `ChildResult` off `sparents/my-children/{id}/results`,
 * which the parent portal has been reading, and the rest are what
 * `/teachers/me/results` sends off the same table. `homework_project` is the
 * one field known only from the write contract.
 *
 * Money-style strings: every figure comes back quoted, so each is read as a
 * number rather than believed as text.
 */
export type Mark = {
  id: number
  student_id: number
  subject_id: number
  regno?: string | null
  class_arm_id?: number | null
  department_id?: number | null
  session_id?: number | null
  semester_id?: number | null

  /** The four parts a mark is entered as. Their sum is `total`. */
  first_ca?: string | number | null
  second_ca?: string | number | null
  homework_project?: string | number | null
  first_exam?: string | number | null

  /**
   * **Worked out by the school, never sent to it.** `total` is the four parts
   * summed and `grade` comes from `grade_scales` — the same table the report
   * sheet prints from. A client that posts either has either bypassed the
   * school's grading scale or posted an arithmetic mistake.
   */
  total?: string | number | null
  grade?: string | null
  remark?: string | null

  /** The older two-column shape, still filed by `teachers/me/scores`. */
  ca?: string | number | null
  score?: string | number | null

  approval_status?: string | null
  uploaddate?: string | null
  approved_at?: string | null
  approved_by?: number | null
  /** Written against every mark in a batch that was sent back. */
  rejection_reason?: string | null

  /** Expanded beside the ids, as the sibling endpoints expand them. */
  session?: { id: number; name: string } | null
  semester?: { id: number; name: string } | null
  subject?: { id: number; name: string; subjectcode?: string | null } | null
  department?: { id: number; name: string; deptcode?: string | null } | null
  student?: {
    id: number
    fname?: string | null
    mname?: string | null
    lname?: string | null
    regno?: string | null
  } | null
  user?: { id: number; fname?: string | null; lname?: string | null } | null
}

/** Every filter is optional; the endpoint answers the whole register without one. */
export type MarkListParams = PageParams & {
  department_id?: number
  class_arm_id?: number
  subject_id?: number
  semester_id?: number
  session_id?: number
  student_id?: number
  approval_status?: ApprovalStatus
  q?: string
}

/**
 * A mark as it is entered. The four parts and nothing else — a total over 100
 * is a 422 that shows the arithmetic.
 */
export type EnterMarkBody = {
  student_id: number
  subject_id: number
  first_ca?: number
  second_ca?: number
  homework_project?: number
  first_exam?: number
}

/**
 * A correction. **A field left out keeps whatever the mark already had**, so
 * correcting only the exam does not silently zero the CA — which is why this
 * is a partial rather than the whole body again.
 *
 * A correction returns the mark to the queue and the pupil stops seeing it: a
 * released mark that changes without anyone signing it off is a report sheet
 * nobody checked.
 */
export type CorrectMarkBody = Partial<Omit<EnterMarkBody, 'student_id' | 'subject_id'>>

/** The four ids that group a batch — what the office signs off at once. */
export type BatchKey = {
  subject_id: number
  department_id: number
  semester_id: number
  session_id: number
}

/** The reason is stored against every mark in the batch, for the teacher to read. */
export type RejectBatchBody = BatchKey & { reason: string }

/** `pending` is how a released mark is withdrawn. */
export type DecideBody = { status: ApprovalStatus }

/**
 * One batch waiting on the office.
 *
 * **Unverified.** The four ids are certain — `approve` and `reject` take
 * exactly them, so a queue that did not name them could not be acted on — and
 * everything past that is read tolerantly by `batchRow`, which is the single
 * place to correct once a populated queue has been seen.
 */
export type PendingBatch = BatchKey & Record<string, unknown>

/** `department_id` is required; the rest narrow the sheet. */
export type ClassSheetParams = {
  department_id: number
  class_arm_id?: number
  semester_id?: number
  session_id?: number
  /** Leaves out anything the office has not released. */
  approved_only?: 1
}

/**
 * The broadsheet: every pupil in the class against every subject.
 *
 * **Unverified**, and read through `sheetTable`. Position is **computed, never
 * stored** — it depends on every other pupil's marks, so a stored copy is
 * wrong the moment one changes — and ties share a place.
 */
export type ClassSheet = Record<string, unknown>

export type MyMarkParams = {
  session_id?: number
  semester_id?: number
  subject_id?: number
}

/**
 * The signed-in pupil's own released marks, with the term average.
 *
 * **The envelope is unverified.** `marksOf` and `averageOf` read it, and a
 * shape that turns out to differ is corrected in those two functions rather
 * than across the pages.
 */
export type MyMarks = Record<string, unknown>
