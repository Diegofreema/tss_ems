import type {
  Coverage,
  MarkInput,
  MyClass,
  RegisterStudent,
  StatusCatalogue,
} from '../../../../api/attendance/types.ts'
import { ignoredNote } from '../../../../api/attendance/ignored.ts'
import { toApiDate } from '../../../../features/collections/date-range.ts'
import type { SegmentedTone } from '../../../../components/common/segmented-tone.ts'
import { capitalise, formatDate } from '../../../../lib/format.ts'

/** Kept exported from here: it was this page's sentence before it was the drain's. */
export { ignoredNote }

/** One of the school's words for a mark, as the sheet offers it. */
export type StatusOption = {
  value: string
  label: string
  /** Whether this word means the child was in the building. */
  inSchool: boolean
  /** What the button is filled with once it is chosen. See `statusTone`. */
  tone: SegmentedTone
}

/**
 * The colour a mark wears when it is set.
 *
 * Read off the **word**, deliberately, and not off `inSchool`: present and
 * late are both counted as being in school, and they are exactly the two a
 * teacher most needs to tell apart on a row they are about to save. Grouping
 * the colours by the school's own arithmetic would paint them the same.
 *
 * A word this does not recognise keeps the brand fill the control has always
 * used — the catalogue is the school's and may hold words nobody here has
 * seen, and an unrecognised mark must still look chosen. Two unknown words
 * would share a colour, which is worse than four distinct ones and much better
 * than a button that reads as untouched.
 */
export function statusTone(value: string): SegmentedTone {
  switch (value.trim().toLowerCase()) {
    case 'present':
      return 'good'
    case 'absent':
      return 'bad'
    case 'late':
      return 'warn'
    default:
      // Excused among them: authorised rather than good or bad, which is what
      // the brand blue already says everywhere else in the app.
      return 'accent'
  }
}

/**
 * The four words, used only if `/attendances/statuses` cannot be read at all.
 *
 * Not a guess: this is what that endpoint answers, copied down so a 500 on it
 * leaves a teacher with a working register rather than a page with no buttons.
 * The endpoint stays the authority — it is asked first, every time.
 */
const FALLBACK: StatusCatalogue = {
  statuses: ['present', 'absent', 'late', 'excused'],
  counted_as_present: ['present', 'late'],
}

/**
 * The statuses a mark may take.
 *
 * **Which words count as being in school is a separate list**, not a flag on
 * each word — so it is read from `counted_as_present` rather than from the
 * word itself. Late being present is the school's rule, not this page's
 * reading of the English.
 */
export function statusOptions(catalogue: StatusCatalogue | undefined): StatusOption[] {
  const read = catalogue?.statuses?.length ? catalogue : FALLBACK
  const inSchool = new Set(read.counted_as_present ?? [])

  return read.statuses.map((word) => ({
    value: word,
    label: capitalise(word),
    inSchool: inSchool.has(word),
    tone: statusTone(word),
  }))
}

/** An arm this teacher takes the roll for. */
export type ClassOption = { id: number; label: string; roll: number }

/**
 * The arms on `/attendances/my-classes`, named the way a teacher would say it.
 *
 * The class and the arm are separate fields — "JSS III" beside an `arm_name`
 * of "C" — so they are joined, unless the arm name already carries the class,
 * which on this school's data it sometimes does.
 */
export function myClassOptions(classes: MyClass[] | undefined): ClassOption[] {
  return (classes ?? []).map((arm) => {
    const klass = arm.class?.trim() ?? ''
    const name = arm.arm_name?.trim() || `Arm ${arm.class_arm_id}`
    return {
      id: arm.class_arm_id,
      label: klass && !name.startsWith(klass) ? `${klass} ${name}` : name,
      roll: arm.pupils ?? 0,
    }
  })
}

/** What the teacher has ticked but not yet filed, keyed by student id. */
export type Edit = { status?: string; notes?: string }
export type Edits = Record<string, Edit>

export type RegisterRow = {
  student_id: number
  name: string
  regno: string
  /** Null where nobody has marked this student — never defaulted to present. */
  status: string | null
  notes: string
  /** Whether what is on screen differs from what the school holds. */
  edited: boolean
}

/**
 * One row per student on the roll, with whatever the teacher has ticked on top.
 *
 * An unmarked student stays unmarked. Defaulting them to present would make an
 * untaken register look exactly like a day when everybody turned up.
 */
export function registerRows(students: RegisterStudent[], edits: Edits): RegisterRow[] {
  return students.map((student) => {
    const key = String(student.student_id)
    const held = student.status ?? null
    const heldNotes = student.notes ?? ''
    const edit = edits[key]
    const status = edit?.status ?? held
    const notes = edit?.notes ?? heldNotes

    return {
      student_id: student.student_id,
      name: student.name?.trim() || `Student ${student.student_id}`,
      regno: student.regno?.trim() || '',
      status,
      notes,
      edited: status !== held || notes !== heldNotes,
    }
  })
}

/**
 * The marks to send, as `POST /attendances/register` wants them.
 *
 * **Only the rows the teacher actually touched.** A student left out is left
 * alone by the endpoint, which is the whole reason a partial save is safe: a
 * dropped connection must never become a child's absence record.
 *
 * A row with no note travels as a bare word; only one carrying a note needs
 * the object form.
 */
export function changedMarks(rows: RegisterRow[]): Record<string, MarkInput> {
  const marks: Record<string, MarkInput> = {}
  for (const row of rows) {
    if (!row.edited || !row.status) continue
    const notes = row.notes.trim()
    marks[String(row.student_id)] = notes ? { status: row.status, notes } : row.status
  }
  return marks
}

export type Tally = {
  students: number
  marked: number
  unmarked: number
  /** How many of the marks mean the child was in the building. */
  inSchool: number
  byStatus: { value: string; label: string; count: number }[]
}

/**
 * The counts as the teacher ticks, which the server's own summary cannot give:
 * that one counts what is saved, and this sheet is not saved yet.
 *
 * Which words count as being in school comes off `/attendances/statuses`, not
 * off the word itself — late being present is the school's rule, not this
 * page's reading of the English.
 */
export function liveTally(rows: RegisterRow[], statuses: StatusOption[]): Tally {
  const byStatus = statuses.map((status) => ({
    value: status.value,
    label: status.label,
    count: rows.filter((row) => row.status === status.value).length,
  }))
  const marked = rows.filter((row) => row.status).length

  return {
    students: rows.length,
    marked,
    unmarked: rows.length - marked,
    inSchool: statuses
      .filter((status) => status.inSchool)
      .reduce(
        (total, status) => total + rows.filter((row) => row.status === status.value).length,
        0,
      ),
    byStatus,
  }
}

/**
 * Whether the date is one the endpoint will take. A register for a day that
 * has not happened is a 422, and saying so here saves the teacher filling a
 * sheet that cannot be filed.
 */
export function isFuture(date: string, today = toApiDate(new Date()) ?? ''): boolean {
  return Boolean(date) && Boolean(today) && date > today
}

/** The days nobody marked, newest first, ready to open. */
export function missingDays(coverage: Coverage | undefined): { iso: string; label: string }[] {
  return [...(coverage?.missing ?? [])]
    .sort((one, two) => two.localeCompare(one))
    .map((iso) => {
      const at = new Date(`${iso}T00:00:00`)
      return { iso, label: Number.isNaN(at.getTime()) ? iso : formatDate(at) }
    })
}
