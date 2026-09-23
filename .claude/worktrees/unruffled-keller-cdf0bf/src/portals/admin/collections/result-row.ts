import type {
  ApprovalStatus,
  BatchKey,
  EnterMarkBody,
  CorrectMarkBody,
  Mark,
  PendingBatch,
} from '../../../api/results/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { looseId, looseText, pick } from '../../../features/collections/loose.ts'
import { mark } from '../../../features/collections/mark.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'

/** The three states, as the office reads them. */
export const STATE_LABEL: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Sent back',
}

/** Whatever the column holds, as one of the three the API actually stores. */
export function markState(status: string | null | undefined): ApprovalStatus {
  const state = status?.trim().toLowerCase()
  if (state === 'approved') return 'approved'
  if (state === 'rejected' || state === 'declined') return 'rejected'
  return 'pending'
}

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** Every part of the pupil's name the mark carries, or the number instead. */
export function pupilName(entry: Mark): string {
  const named = [entry.student?.fname, entry.student?.mname, entry.student?.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return named || entry.student?.regno?.trim() || entry.regno?.trim() || `Pupil ${entry.student_id}`
}

/** Who filed it — not always a teacher: a batch the office uploaded is theirs. */
export function filedBy(entry: Mark): string {
  const named = [entry.user?.fname, entry.user?.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return named || BLANK
}

/**
 * One mark, as the office's register reads it.
 *
 * The four parts are on the record panel rather than the table: a register
 * showing eight numeric columns is a spreadsheet, and what an office scans
 * for is the pupil, the subject, the total and whether it has been released.
 */
export function markRow(entry: Mark): Row {
  const state = markState(entry.approval_status)

  return {
    id: String(entry.id),
    name: pupilName(entry),
    subject: looseText(entry.subject) === BLANK ? `Subject ${entry.subject_id}` : looseText(entry.subject),
    klass: looseText(entry.department),
    total: mark(entry.total),
    grade: text(entry.grade),
    state: STATE_LABEL[state],

    // Read by the record panel rather than the table.
    adm: text(entry.student?.regno ?? entry.regno),
    term: looseText(entry.semester),
    session: looseText(entry.session),
    firstCa: mark(entry.first_ca),
    secondCa: mark(entry.second_ca),
    homework: mark(entry.homework_project),
    firstExam: mark(entry.first_exam),
    remark: text(entry.remark),
    filed: when(entry.uploaddate),
    decided: when(entry.approved_at),
    by: filedBy(entry),
    // Only a batch that was sent back carries one, and it is the whole point
    // of the state: the teacher has to know what to fix.
    reason: text(entry.rejection_reason),
  }
}

/**
 * Whether a mark may be deleted.
 *
 * The API answers 409 for a released one — it may already be on a report
 * sheet a family has read — so the button is not offered rather than offered
 * and refused. Withdrawing it first, with the row's own control, puts it back
 * in reach.
 */
export function deletable(row: Row): boolean {
  return row.state !== STATE_LABEL.approved
}

/* ------------------------------------------------------------------ *
 * Batches
 * ------------------------------------------------------------------ */

/** The four ids that name a batch, as one row id — "10-1-1-8". */
export function batchId(key: BatchKey): string {
  return [key.subject_id, key.department_id, key.semester_id, key.session_id].join('-')
}

export function parseBatchId(recordId: string): BatchKey | undefined {
  const parts = recordId.split('-').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part <= 0)) {
    return undefined
  }
  const [subject_id, department_id, semester_id, session_id] = parts
  return { subject_id, department_id, semester_id, session_id }
}

/**
 * One batch in the queue, read defensively.
 *
 * `GET /results/pending` has never been read with anything on it, so what a
 * batch row holds is unverified — except the four ids, which `approve` and
 * `reject` both take, so a queue that did not name them could not be acted on
 * at all. Everything else is read for the first key that carries it.
 */
export function batchRow(batch: PendingBatch): Row {
  const key: BatchKey = {
    subject_id: looseId(pick(batch, 'subject_id', 'subject')) ?? 0,
    department_id: looseId(pick(batch, 'department_id', 'department')) ?? 0,
    semester_id: looseId(pick(batch, 'semester_id', 'semester')) ?? 0,
    session_id: looseId(pick(batch, 'session_id', 'session')) ?? 0,
  }

  const filed = pick(batch, 'uploaddate', 'datecreated', 'created_at', 'filed_at')

  return {
    id: batchId(key),
    subject: looseText(pick(batch, 'subject_name', 'subject')),
    klass: looseText(pick(batch, 'department_name', 'class_name', 'department')),
    arm: looseText(pick(batch, 'class_arm_name', 'class_arm')),
    term: looseText(pick(batch, 'semester_name', 'semester')),
    session: looseText(pick(batch, 'session_name', 'session')),
    marks: looseText(pick(batch, 'total', 'count', 'marks', 'results', 'pupils')),
    by: looseText(pick(batch, 'teacher', 'teacher_name', 'uploaded_by', 'user')),
    filed: typeof filed === 'string' ? when(filed) : BLANK,
  }
}

/**
 * The batches out of the queue's envelope.
 *
 * Which key holds them has not been seen either, so the named ones are tried
 * and then any array on the answer is taken — there is only ever one.
 */
export function batchesOf(answer: Record<string, unknown> | undefined): PendingBatch[] {
  if (!answer) return []
  for (const key of ['batches', 'pending', 'results', 'items', 'data']) {
    if (Array.isArray(answer[key])) return answer[key] as PendingBatch[]
  }
  const found = Object.values(answer).find(Array.isArray)
  return (found as PendingBatch[] | undefined) ?? []
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

/** A form's figure as the endpoint takes one, or nothing where it was blank. */
function figure(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * A new mark. The four parts and the two ids — **never the total and never
 * the grade**: both are worked out server-side, one from the school's own
 * grading scale and the other from arithmetic, and a client that sends either
 * has overruled the school.
 */
export function enterBody(values: Record<string, unknown>): EnterMarkBody {
  return {
    student_id: Number(values.student_id),
    subject_id: Number(values.subject_id),
    first_ca: figure(values.first_ca),
    second_ca: figure(values.second_ca),
    homework_project: figure(values.homework_project),
    first_exam: figure(values.first_exam),
  }
}

/**
 * A correction. Only the parts, and only the ones filled in — **a field left
 * out keeps whatever the mark already had**, so correcting the exam alone
 * does not silently zero the CA. The pupil and the subject are not sent: a
 * mark filed against the wrong pupil is deleted, not reassigned.
 */
export function correctBody(values: Record<string, unknown>): CorrectMarkBody {
  const body: CorrectMarkBody = {}
  const parts = ['first_ca', 'second_ca', 'homework_project', 'first_exam'] as const
  for (const part of parts) {
    const amount = figure(values[part])
    if (amount !== undefined) body[part] = amount
  }
  return body
}

/** What the four parts come to, so the form can say it before the API does. */
export function partsTotal(values: Record<string, unknown>): number {
  const parts = ['first_ca', 'second_ca', 'homework_project', 'first_exam'] as const
  return parts.reduce((sum, part) => sum + (figure(values[part]) ?? 0), 0)
}
