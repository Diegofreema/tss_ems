import type {
  Coverage,
  MarkInput,
  MyClass,
  RegisterPupil,
  SavedRegister,
  StatusCatalogue,
} from '../../../../api/attendance/types.ts'
import { toApiDate } from '../../../../features/collections/date-range.ts'
import { capitalise, formatDate } from '../../../../lib/format.ts'

/** One of the school's words for a mark, as the sheet offers it. */
export type StatusOption = {
  value: string
  label: string
  /** Whether this word means the child was in the building. */
  inSchool: boolean
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
  /** Null where nobody has marked this pupil — never defaulted to present. */
  status: string | null
  notes: string
  /** Whether what is on screen differs from what the school holds. */
  edited: boolean
}

/**
 * One row per pupil on the roll, with whatever the teacher has ticked on top.
 *
 * An unmarked pupil stays unmarked. Defaulting them to present would make an
 * untaken register look exactly like a day when everybody turned up.
 */
export function registerRows(pupils: RegisterPupil[], edits: Edits): RegisterRow[] {
  return pupils.map((pupil) => {
    const key = String(pupil.student_id)
    const held = pupil.status ?? null
    const heldNotes = pupil.notes ?? ''
    const edit = edits[key]
    const status = edit?.status ?? held
    const notes = edit?.notes ?? heldNotes

    return {
      student_id: pupil.student_id,
      name: pupil.name?.trim() || `Pupil ${pupil.student_id}`,
      regno: pupil.regno?.trim() || '',
      status,
      notes,
      edited: status !== held || notes !== heldNotes,
    }
  })
}

/**
 * The marks to send, as `POST /attendances/register` wants them.
 *
 * **Only the rows the teacher actually touched.** A pupil left out is left
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
  pupils: number
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
    pupils: rows.length,
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

/**
 * What the endpoint filed and what it threw away.
 *
 * A pupil id from another class is ignored and named rather than filed against
 * a class they are not in — so it is worth repeating on screen, since the
 * teacher will otherwise count the saved rows and find one short.
 */
export function ignoredNote(saved: SavedRegister | undefined): string {
  const ignored = saved?.ignored ?? []
  if (ignored.length === 0) return ''
  return `${ignored.length} pupil ${ignored.length === 1 ? 'id was' : 'ids were'} not in this class and ${ignored.length === 1 ? 'was' : 'were'} not filed: ${ignored.join(', ')}.`
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
