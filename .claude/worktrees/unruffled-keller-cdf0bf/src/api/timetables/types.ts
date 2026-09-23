import type { Pagination } from '../types.ts'

/**
 * The class timetable, under `/timetables`. One row is one period: a subject,
 * on a day, between two times, for one class.
 *
 * Read off bronze on 2026-09-01. The school holds two periods in all — both
 * JSS 1, both Monday — so a grid is normally empty and the empty case is the
 * one to get right.
 */

/**
 * One period, as every endpoint here sends it — flat, with the names already
 * resolved beside the ids. `/timetables/{id}` is documented as returning
 * "fully resolved references (not just IDs)"; it does not. It sends this same
 * row, with `subject_name` and `class_name` as strings rather than records.
 *
 * Half the columns are a university's and are null on every row this school
 * holds: `level_id`, `programetype_id`, `lecturehall_id`, `venue`,
 * `onlinelink`, `where`. They are typed so nothing surprises us, and none of
 * them is worth showing.
 */
export type Period = {
  id: number
  department_id?: number | null
  /** The class's own name, flattened onto the row. */
  class_name?: string | null
  subject_id?: number | null
  subject_name?: string | null
  /** Set instead of a subject for Break, Assembly and the like. Null so far. */
  title?: string | null
  /**
   * What to print in the cell — the subject's name, or the title where the
   * period has no subject. The server resolves it, so nothing here has to.
   */
  label?: string | null
  day_of_week?: DayName | null
  /** `"08:56"` — the school's wall clock, no zone and no seconds. */
  start_time?: string | null
  end_time?: string | null
  session_id?: number | null
  session_name?: string | null
  semester_id?: number | null
  semester_name?: string | null
  dateadded?: string | null
  /** Where it is held. Null on every period; the school records no rooms. */
  where?: string | null
  venue?: string | null
  lecturehall_id?: number | null
  onlinelink?: string | null
  level_id?: number | null
  programetype_id?: number | null
}

export type DayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

/** A column of the grid. Sent as a list, not an object, to keep the order. */
export type TimetableDay = {
  day: DayName
  periods: Period[]
}

export type NamedRef = { id: number; name: string }

/**
 * A whole class timetable, from `/timetables/mine` or `/timetables/class/{id}`.
 *
 * `days` is always the five school days, present and empty where nothing has
 * been entered — so the grid draws itself from this and never invents a
 * column. `message` carries the school's own sentence for an empty timetable
 * ("No timetable has been entered for this class yet.") and is null once
 * periods exist.
 */
export type ClassTimetable = {
  class?: NamedRef | null
  session?: NamedRef | null
  semester?: NamedRef | null
  days?: TimetableDay[] | null
  period_count?: number | null
  message?: string | null
  /**
   * The arm, e.g. "JSS 2 A". On `/timetables/mine` only — the class-scoped
   * endpoint answers for a class rather than a pupil and omits it.
   */
  class_arm?: string | null
}

/**
 * One child's timetable, from `/timetables/children` — read off a guardian's
 * own answer on 2026-09-01.
 *
 * The class arrives three times over: flattened here as `class_id` /
 * `class_name` / `class_arm`, and again inside `timetable.class`. The flat
 * ones are the pupil's placement — `class_arm` is the arm they sit in, which
 * the grid itself does not carry — so the heading is built from these and the
 * calendar from `timetable`.
 *
 * The child is named as one string rather than as a record: no `student`
 * object, no parts of the name kept apart. Names repeat on real households —
 * one guardian on bronze has two children both called "Diego Freeman" in the
 * same class *and* the same arm — so `student_id` is the only thing that tells
 * two entries apart.
 */
export type ChildTimetable = {
  student_id?: number | null
  /** The whole name in one string, as the school entered it. */
  name?: string | null
  class_id?: number | null
  class_name?: string | null
  /** The arm, e.g. "JSS III A". The grid this sits beside has no arm on it. */
  class_arm?: string | null
  /** Null where the child has no class yet; `message` says so. */
  timetable?: ClassTimetable | null
  /** The entry's own reason, against the grid's. Null on every live entry. */
  message?: string | null
}

/** Past terms are addressed by both ids together; either alone is ignored. */
export type TermParams = {
  session_id?: number
  semester_id?: number
}

export type ChildrenParams = {
  /** Narrows to one child. */
  student_id?: number
}

/**
 * The office's flat list. `department_id` and `day_of_week` filter it too —
 * neither is documented, both work — and `page` pages properly.
 */
export type PeriodParams = {
  page?: number
  limit?: number
  department_id?: number
  day_of_week?: DayName
} & TermParams

/**
 * `/timetables` answers with the rows, a pagination block, and the seven day
 * names as a catalogue for a picker. Note the seven: the grid endpoints send
 * five. This list is the one to build a day select from.
 */
export type PeriodList = {
  periods: Period[]
  days: DayName[]
  pagination: Pagination
}

/**
 * What `POST /timetables` takes.
 *
 * `subject_id` or `title` — one of the two, never neither, or the API answers
 * 422. Both times overlapping an existing period for the class answers 409;
 * it tests for overlap, not for an identical slot.
 */
export type PeriodBody = {
  department_id: number
  day_of_week: DayName
  /** `"09:00"`. */
  start_time: string
  end_time: string
  subject_id?: number | null
  /** For Break, Assembly and anything else that is not a subject. */
  title?: string | null
  /** Both default to the current term at the server. */
  session_id?: number
  semester_id?: number
}

/** `PUT /timetables/{id}` changes only what it is sent. Overlap is rechecked. */
export type PeriodEditBody = Partial<PeriodBody>
