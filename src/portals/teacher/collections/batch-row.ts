import type {
  ResultRow,
  UploadBatch,
  UploadBatchKey,
} from '../../../api/teaching/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'

/**
 * An upload batch, read defensively.
 *
 * `GET /teachers/me/uploads` answers `{"batches": []}` for every teaching
 * login on this deployment, so what one of these rows actually holds has not
 * been seen. What is known is the key: the detail endpoint is
 * `uploads/{subject}/{class}/{term}/{session}`, so a batch is those four ids,
 * and the spelling of each is read rather than assumed.
 */

/** The first of these keys the row actually carries. */
function pick(record: UploadBatch | ResultRow, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim() || BLANK
  if (typeof value === 'number') return String(value)
  // The nested rows come back as objects on the endpoints that expand them.
  if (value && typeof value === 'object' && 'name' in value) {
    return text((value as { name: unknown }).name)
  }
  return BLANK
}

function id(value: unknown): number | undefined {
  const parsed = Number(
    value && typeof value === 'object' && 'id' in value
      ? (value as { id: unknown }).id
      : value,
  )
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** The four ids that name a batch, as one row id — e.g. "10-1-1-8". */
export function batchKey(key: UploadBatchKey): string {
  return [key.subjectId, key.departmentId, key.semesterId, key.sessionId].join('-')
}

export function parseBatchKey(recordId: string): UploadBatchKey | undefined {
  const parts = recordId.split('-').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined
  const [subjectId, departmentId, semesterId, sessionId] = parts
  return { subjectId, departmentId, semesterId, sessionId }
}

export function batchRow(batch: UploadBatch): Row {
  const key = {
    subjectId: id(pick(batch, 'subject_id', 'subject')) ?? 0,
    departmentId: id(pick(batch, 'department_id', 'department')) ?? 0,
    semesterId: id(pick(batch, 'semester_id', 'semester')) ?? 0,
    sessionId: id(pick(batch, 'session_id', 'session')) ?? 0,
  }

  return {
    id: batchKey(key),
    subject: text(pick(batch, 'subject_name', 'subject')),
    klass: text(pick(batch, 'department_name', 'class_name', 'department')),
    term: text(pick(batch, 'semester_name', 'semester')),
    session: text(pick(batch, 'session_name', 'session')),
    lines: text(pick(batch, 'total', 'count', 'lines', 'results')),
    state: text(pick(batch, 'approval_status', 'status')),
    uploaded: when(
      typeof pick(batch, 'uploaddate', 'created', 'datecreated') === 'string'
        ? (pick(batch, 'uploaddate', 'created', 'datecreated') as string)
        : undefined,
    ),
  }
}

/**
 * One line of a batch: the student, what was read for them and how it stands.
 *
 * Read the same way the batch itself is — `uploads/{subject}/{class}/{term}/
 * {session}` answers `{"results": []}` on this deployment, so the spelling of
 * a line is read rather than assumed. The keys tried first are the ones
 * `/teachers/me/results` uses, since both come off the same table.
 */
export function lineRow(line: ResultRow, index: number): Row {
  const student = pick(line, 'student') as Record<string, unknown> | undefined
  const named = [student?.fname, student?.lname]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')

  return {
    id: text(pick(line, 'id')) === BLANK ? String(index) : text(pick(line, 'id')),
    student: named || text(pick(line, 'regno', 'student_id')),
    adm: text(pick(line, 'regno')),
    ca: text(pick(line, 'ca')),
    exam: text(pick(line, 'score', 'exam')),
    total: text(pick(line, 'total')),
    grade: text(pick(line, 'grade')),
    state: text(pick(line, 'approval_status', 'status')),
  }
}
