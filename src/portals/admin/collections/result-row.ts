import type {
  ApprovalStatus,
  BatchKey,
  EnterMarkBody,
  CorrectMarkBody,
  Mark,
  PendingBatch,
} from '../../../api/results/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { looseText, pick } from '../../../features/collections/loose.ts'
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

/** Every part of the student's name the mark carries, or the number instead. */
export function studentName(entry: Mark): string {
  const named = [entry.student?.fname, entry.student?.mname, entry.student?.lname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return named || entry.student?.regno?.trim() || entry.regno?.trim() || `Student ${entry.student_id}`
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
 * The class a mark was filed against.
 *
 * `department` is what every sibling endpoint expands and what this row read
 * for, and the register showed a dash in the Class column for every mark: the
 * answer carries the class under `classdata` instead. That is not as odd as it
 * looks — the API's table for a class is `departments`, and `department` on a
 * mark is the *id*, so the expansion had to be called something else.
 *
 * Read tolerantly rather than repinned, because none of this shape was seen
 * live when it was written: the marking cycle shipped while bronze was
 * refusing every login, so the expansions were inferred from the guardian's
 * and the teacher's own endpoints. The named keys are tried in turn and the
 * value is read whether it arrived as a string or as an expanded row.
 *
 * The one place to correct — and to shrink to a single key — once a populated
 * answer has been read properly.
 */
export function markClass(entry: Mark): string {
  const record = entry as unknown as Record<string, unknown>
  return className(
    pick(record, 'classdata', 'department', 'class', 'class_name', 'department_name'),
  )
}

/** A class however it arrived: a name, or a row that carries one. */
function className(value: unknown): string {
  if (value && typeof value === 'object') {
    const named = pick(value as Record<string, unknown>, 'name', 'class_name', 'department', 'deptcode')
    return named === undefined ? BLANK : looseText(named)
  }
  return looseText(value)
}

/**
 * One mark, as the office's register reads it.
 *
 * The four parts are on the record panel rather than the table: a register
 * showing eight numeric columns is a spreadsheet, and what an office scans
 * for is the student, the subject, the total and whether it has been released.
 */
export function markRow(entry: Mark): Row {
  const state = markState(entry.approval_status)

  return {
    id: String(entry.id),
    name: studentName(entry),
    subject: looseText(entry.subject) === BLANK ? `Subject ${entry.subject_id}` : looseText(entry.subject),
    klass: markClass(entry),
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

/**
 * Reads a row id back into the four ids.
 *
 * Both separators, because the queue sends its own `key` underscore-joined and
 * the register used to compose one with hyphens. The order is the same either
 * way, so a URL written before the school's own key was used still opens the
 * batch it named.
 */
export function parseBatchId(recordId: string): BatchKey | undefined {
  const parts = recordId.split(/[-_]/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part <= 0)) {
    return undefined
  }
  const [subject_id, department_id, semester_id, session_id] = parts
  return { subject_id, department_id, semester_id, session_id }
}

/**
 * One batch in the queue.
 *
 * Read live on 2026-09-10, so this reads the answer's own keys rather than
 * trying spellings: every label is flat beside its id, the class is `class`,
 * and the count of students is `pupils`.
 *
 * `uploaded` is passed straight through. It arrives already written for a
 * reader — `"9/1/26, 2:38 PM"` — so `when()` would either re-format a date it
 * had to guess the zone of, or hand back "Invalid Date".
 */
export function batchRow(batch: PendingBatch): Row {
  const key: BatchKey = {
    subject_id: Number(batch.subject_id) || 0,
    department_id: Number(batch.department_id) || 0,
    semester_id: Number(batch.semester_id) || 0,
    session_id: Number(batch.session_id) || 0,
  }

  return {
    // The school's own name for the batch where it sent one. It is the same
    // four ids in the same order, so the two forms name the same thing.
    id: batch.key?.trim() || batchId(key),
    subject: text(batch.subject),
    klass: text(batch.class),
    term: text(batch.semester),
    session: text(batch.session),
    students: count(batch.pupils),
    filed: text(batch.uploaded),
  }
}

/** A tally. Nothing sent reads blank; a real zero reads as zero. */
function count(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : BLANK
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
 * does not silently zero the CA. The student and the subject are not sent: a
 * mark filed against the wrong student is deleted, not reassigned.
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
