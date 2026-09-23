import type { PageParams } from '../types.ts'

/** Reference rows that feed the attendance filter UI. */
export type AttendanceDepartment = {
  id: number
  name: string
  deptcode?: string
}

/**
 * An arm as this endpoint spells it — `arm_name`, not `name`, and without the
 * class expanded, so the class it belongs to has to come from `department_id`.
 */
export type AttendanceClassArm = {
  id: number
  department_id: number
  arm_name: string
  arm_description?: string | null
  class_teacher_id?: number | null
  status?: string | null
}

/** How a day's marks break down. Every register uses these four words. */
export type AttendanceTally = {
  present: number
  absent: number
  late: number
  excused: number
}

/**
 * One teachable group on the chosen day.
 *
 * `department_name` is the class and the arm already joined — "JSS 1 - JSS1 A"
 * — and reads as the class alone where the class has no arms. `present_count`
 * is scoped to the date; a class nobody has marked and a class where everyone
 * is away both read 0, and the row cannot tell them apart.
 */
export type AttendanceClassCount = {
  department_id: number
  class_arm_id: number | null
  department_name: string
  total_students: number
  present_count: number
}

export type AttendanceDashboard = {
  /** The day answered for, which is today where none was asked for. */
  date: string
  today: AttendanceClassCount[]
  /**
   * Every attendance record the school has ever taken — NOT the day above.
   * The endpoint returns the same figures whatever `date` is asked for, so
   * this is not a day's summary and must never be shown as one.
   */
  overall: AttendanceTally & { total_records: number }
}

export type AttendanceReportParams = PageParams & {
  department_id?: number
  class_arm_id?: number
  /** YYYY-MM-DD. An empty range is the current month. */
  start_date?: string
  end_date?: string
  status?: string
}

/** The CSV export takes the report's filters minus paging. */
export type AttendanceExportParams = Omit<AttendanceReportParams, 'page' | 'limit'>

/** One mark: one student, one day. */
export type AttendanceRecord = {
  id: number
  /** YYYY-MM-DD. */
  attendance_date: string
  status: string
  notes?: string | null
  student: {
    id: number
    regno: string | null
    name: string
    department: string | null
    class_arm: string | null
  }
  /** Absent where the mark was not made by a member of staff on record. */
  teacher?: { id: number; name: string } | null
}

export type AttendanceReport = {
  /** Echoed back, filled in with the defaults the endpoint chose. */
  filters: {
    department_id: number | null
    class_arm_id: number | null
    start_date: string
    end_date: string
    status: string | null
  }
  /**
   * The breakdown over the range, class and arm asked for — but NOT over
   * `status`, which narrows the records alone. Asking for absences leaves
   * these four unchanged, which is what makes them a breakdown.
   */
  stats: AttendanceTally & { total: number }
  records: AttendanceRecord[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

/* ------------------------------------------------------------------ *
 * The daily register — `/attendances`, the controller a class teacher
 * takes the roll with. The office's own reporting lives above, on
 * `admin-attendances`; these two are one feature seen from two desks.
 * ------------------------------------------------------------------ */

/**
 * The words a mark can be, and which of them mean the child was in school.
 *
 * Read from `GET /attendances/statuses` rather than written down: **the flag
 * is a separate list, not a property of each word** — late is present because
 * the child is in the building, and excused is an authorised absence that is
 * neither held against the student nor counted as attendance.
 */
export type StatusCatalogue = {
  statuses: string[]
  counted_as_present: string[]
  /** The school's own sentence explaining late and excused. */
  note?: string
}

/**
 * An arm this teacher is class teacher of, with its roll count. A teacher who
 * is nobody's class teacher gets a 404 rather than an empty list.
 */
export type MyClass = {
  class_arm_id: number
  arm_name: string
  department_id: number
  /** The class the arm belongs to — "JSS III" beside an `arm_name` of "C". */
  class: string
  /** Why this arm is theirs, in the API's own words. */
  mine_because: string
  /** How many students are on the roll. The API's own spelling. */
  pupils: number
}

/** One student on one day. `status` is null where nobody has marked them yet. */
export type RegisterStudent = {
  student_id: number
  name: string
  regno: string | null
  status: string | null
  notes: string | null
  /** The row the mark was saved as; absent on a student nobody has marked. */
  attendance_id?: number | null
}

/** How the day breaks down, the school's own count of what it holds. */
export type RegisterSummary = {
  present: number
  absent: number
  late: number
  excused: number
  unmarked: number
  /** The API's own spelling. */
  pupils: number
}

/** The arm as the register spells it — the class already joined on. */
export type RegisterArm = {
  class_arm_id: number
  arm_name: string
  department_id: number
  class: string
}

/** One arm, one day. */
export type Register = {
  /** YYYY-MM-DD. */
  date: string
  arm: RegisterArm
  /** The API's own spelling; every screen calls them students. */
  pupils: RegisterStudent[]
  /** Whether anybody has marked this day at all. */
  taken: boolean
  summary: RegisterSummary
}

export type RegisterParams = {
  class_arm_id: number
  /** YYYY-MM-DD. Absent means today. */
  date?: string
}

/** A bare status, or one carrying the note the teacher wrote beside it. */
export type MarkInput = string | { status: string; notes: string }

export type TakeRegisterBody = {
  class_arm_id: number
  /** YYYY-MM-DD. A date in the future is a 422. */
  date: string
  /**
   * Keyed by student id. **A student left out is left alone**, not marked
   * absent — a partial save is a partial save, and guessing would turn a
   * dropped connection into a child's absence record.
   */
  marks: Record<string, MarkInput>
}

export type SavedRegister = {
  saved: number
  /** Ids that were not in this class and were filed against nothing. */
  ignored: number[]
  register: Register
}

export type CoverageParams = {
  class_arm_id: number
  from?: string
  to?: string
}

/**
 * Not who was absent — which registers were never taken. Weekends are not
 * counted as missing.
 */
export type Coverage = {
  from: string
  to: string
  school_days: number
  taken: number
  /** YYYY-MM-DD, the days nobody marked. */
  missing: string[]
  missing_count: number
}

export type MyAttendanceParams = {
  from?: string
  to?: string
  status?: string
}

/**
 * A student's own record, or a guardian's children.
 *
 * Unverified shape — `marksOf` and `attendanceTally` in the student portal
 * name the keys they try. The percentage on it is in-school over **days
 * marked**, not over the length of term: only the days somebody actually took
 * a register are evidence.
 */
export type MyAttendance = Record<string, unknown> | unknown[]
