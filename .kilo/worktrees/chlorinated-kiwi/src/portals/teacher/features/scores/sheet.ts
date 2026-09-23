import type {
  EnterScoreBody,
  TeacherResult,
  TeacherStudent,
} from '../../../../api/teaching/types.ts'
import type { MarkingTerm } from '../term/term.ts'
import { CA_MAX, EXAM_MAX, markOf, totalOf } from './grade.ts'
import { scoreKey, type QueuedScore } from './queued.ts'

/** What a teacher has typed but not yet filed, keyed subject and student. */
export type Edit = { ca?: string; exam?: string }
export type Edits = Record<string, Edit>

export type SheetRow = {
  student_id: number
  name: string
  adm: string
  ca: string
  exam: string
  total: number
  /**
   * The grade the school worked out for the mark it holds. Blank while a row
   * is edited: the bands are the server's, and showing a guess beside a number
   * the teacher is still typing would be inventing one.
   */
  grade: string
  /** Whether what is typed differs from the mark this device holds. */
  edited: boolean
  /** This mark is written down on the device and not yet with the school. */
  waiting: boolean
  /** Set where a mark is above what the endpoint will take. */
  problem: string
}

export const editKey = (subjectId: number, studentId: number) =>
  `${subjectId}|${studentId}`

function marked(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? String(Math.round(parsed)) : String(value)
}

function studentName(student: TeacherStudent): string {
  return (
    [student.fname, student.mname, student.lname].filter(Boolean).join(' ').trim() ||
    `Student ${student.id}`
  )
}

/** What the endpoint will refuse, said before it is sent rather than after. */
function problemWith(ca: string, exam: string): string {
  if (markOf(ca) > CA_MAX) return `CA is above the ${CA_MAX} mark maximum`
  if (markOf(exam) > EXAM_MAX) return `Exam is above the ${EXAM_MAX} mark maximum`
  return ''
}

/**
 * One sheet: every student in the arm, against the mark the school already holds
 * for them in this subject, with whatever the teacher has typed on top.
 *
 * A student with no mark yet is a blank row rather than a missing one — the
 * whole point of the sheet is filing the first mark.
 */
export function sheetRows(
  students: TeacherStudent[],
  marks: TeacherResult[],
  subjectId: number,
  edits: Edits,
  /**
   * Marks this device has written down and not yet sent.
   *
   * They stand in front of the school's own: a teacher who files a sheet with
   * no connection must see what they filed, not the mark it replaced, and must
   * not see their own work as an unsaved edit either — it is saved, on the
   * device, which is a different thing from lost.
   */
  queued: ReadonlyMap<string, QueuedScore> = new Map(),
): SheetRow[] {
  return students.map((student) => {
    const school = marks.find(
      (mark) => mark.student_id === student.id && mark.subject_id === subjectId,
    )
    const waiting = queued.get(scoreKey(subjectId, student.id))
    const held = waiting ? { ...school, ca: waiting.ca, score: waiting.exam } : school
    const heldCa = marked(held?.ca)
    // `score` is the exam half; `total` is that plus the CA, worked out by the
    // school rather than sent to it.
    const heldExam = marked(held?.score)
    const edit = edits[editKey(subjectId, student.id)]
    const ca = edit?.ca ?? heldCa
    const exam = edit?.exam ?? heldExam
    const edited = ca !== heldCa || exam !== heldExam

    return {
      student_id: student.id,
      name: studentName(student),
      adm: student.regno?.trim() || '',
      ca,
      exam,
      total: totalOf(ca, exam),
      // Blank while a row is edited, and blank while it waits: the bands are
      // the school's, and it has not seen this mark yet.
      grade: edited || waiting ? '' : (school?.grade?.trim() ?? ''),
      edited,
      waiting: Boolean(waiting),
      // Only what the teacher has typed is held to the entry endpoint's caps.
      // Marks already on file routinely sit above them — a spreadsheet upload
      // carries three exam columns and files their sum — and those are the
      // office's to correct, not a reason to block this sheet.
      problem: edited ? problemWith(ca, exam) : '',
    }
  })
}

/**
 * The rows to file, as `POST /teachers/me/scores` wants them — one call per
 * student, and only for the rows actually changed. A row the endpoint would
 * refuse is left out; the sheet flags it instead.
 */
export function changedMarks(
  rows: SheetRow[],
  subjectId: number,
  term: MarkingTerm,
): EnterScoreBody[] {
  return rows
    .filter((row) => row.edited && !row.problem)
    .map((row) => ({
      student_id: row.student_id,
      subject_id: subjectId,
      session_id: term.session_id,
      semester_id: term.semester_id,
      ca: markOf(row.ca),
      exam: markOf(row.exam),
    }))
}
