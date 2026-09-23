import type { PageParams } from '../types.ts'

/** A guardian record. The API calls the table `sparents`. */
export type Parent = {
  id: number
  user_id: number
  fathersname: string | null
  mothersname: string | null
  pemailaddress: string | null
  fatherphone: string | null
  motherphone: string | null
  fathersjob: string | null
  mothersjob: string | null
  address: string | null
  occupation: string | null
  status: ParentStatus
  username?: string
  /**
   * Expanded by the detail endpoint only, and as a sibling of the record in
   * the envelope rather than a field on it — the service folds it on.
   */
  children?: Child[]
}

/**
 * An invoice as a guardian's own list sends it — one call for every child on
 * the record, and a different shape from the office register: the student and
 * the fee arrive as names rather than as expanded records, and the amount as
 * a string.
 *
 * `createdate` carries `+00:00` while every other endpoint stamps the same
 * wall clock `+01:00`. It is the school's clock either way, so the offset is
 * dropped rather than believed — see `schoolTime`.
 */
export type FamilyInvoice = {
  id: number
  student_id: number
  /** The student's name, whole. Null where the record behind it has gone. */
  student: string | null
  fee: string | null
  session: string | null
  amount: string
  /** "Unpaid" until settled, then "success" — the gateway's word, not ours. */
  paystatus: string
  payday: string | null
  createdate: string
}

export type ParentStatus = 'active' | 'deactivated'

export type ParentListParams = PageParams & {
  status?: ParentStatus
  /** Matches either parent's name, the email or the father's phone. */
  q?: string
}

/** A child as the parent screens see them — a slim view of the student record. */
export type Child = {
  id: number
  regno: string | null
  fname: string
  lname: string
  mname: string | null
  gender: string | null
  studentstatus: string | null
  department_id: number | null
  department: string | null
  class_arm: string | null
}

/**
 * Creates the guardian record and the login behind it, and returns the
 * username with its default password. A failed guardian save rolls the login
 * back.
 */
export type ParentBody = {
  fathersname?: string
  mothersname?: string
  pemailaddress?: string
  address?: string
  fatherphone?: string
  motherphone?: string
  fathersjob?: string
  mothersjob?: string
}

export type ParentDashboard = Record<string, unknown>

/**
 * One approved subject result, as a guardian's own view sends it.
 *
 * The marks arrive as decimal strings, and three of them are the parts of the
 * other two: `ca` is the continuous assessment already added up, `score` the
 * examination mark, and `total` those two together. The register shows the
 * three that add up and the record panel shows the parts they came from.
 */
export type ChildResult = {
  id: number
  subject: string | null
  first_ca: string | null
  second_ca: string | null
  first_exam: string | null
  ca: string | null
  score: string | null
  total: string | null
  grade: string | null
  remark: string | null
  session: string | null
  semester: string | null
}

/** What the whole sheet comes to, over the session and term asked for. */
export type ResultSummary = {
  subjects: number
  total_marks: number
  average: number
}

export type ChildResults = {
  student: Child
  results: ChildResult[]
  summary: ResultSummary
}

/**
 * One day's mark on a child's own register.
 *
 * The endpoint answered with an empty list for every child on this school, so
 * the row is typed from `admin-attendances/report`, which reads the same
 * table. Only the fields the register shows are declared: the student this
 * endpoint has already named above the list, and anything else it sends is
 * ignored rather than guessed at.
 */
export type ChildMark = {
  id: number
  /** YYYY-MM-DD. */
  attendance_date: string
  status: string
  notes?: string | null
}

/** The rate counts a late mark as attended, as the API's own wording says. */
export type AttendanceStats = {
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number
}

export type ChildAttendance = {
  student: Child
  /** The dates answered for, which is this month where none were asked for. */
  range: { from: string; to: string }
  attendance: ChildMark[]
  stats: AttendanceStats
}

export type ChildResultParams = {
  session_id?: number
  semester_id?: number
}

/** Dates are YYYY-MM-DD and default to the current month. */
export type ChildAttendanceParams = {
  start_date?: string
  end_date?: string
}

/**
 * One computer-based test set for a child's class, and where that child
 * stands on it.
 *
 * The two stamps are the same wall clock written two ways — `opendate` carries
 * `+00:00` while `closedate` carries no zone at all, and the sample sends both
 * as 09:52. Both are the school's own clock, so the offset is dropped rather
 * than believed; see `schoolTime`.
 */
export type ChildAssignment = {
  /** The assignment. This is what identifies one the child has not yet sat. */
  setassignment_id: number
  title: string | null
  subject: string | null
  /** Minutes allowed once opened. Null on an assignment with no limit set. */
  time_limit: number | null
  opendate: string | null
  closedate: string | null
  /** 'available' until the child sits it, then 'completed'. */
  status: string
  /** The child's own sitting, once there is one. Null while unsat. */
  assignment_id: number | null
}

/** Each child on the record, with the assignments set for their class. */
export type ChildAssignments = {
  student: Child
  assignments: ChildAssignment[]
}

/**
 * One answer per question: a number for multiple choice, free text for theory
 * — `{"2": 6, "3": "You add the two numbers together."}`.
 *
 * **What the key is has not been settled.** It was described as "the number of
 * the question", which reads either as the question's id or as its position in
 * the assignment, and the sample cannot tell them apart: it answers 2 and 3 and
 * leaves whatever 1 is unanswered. Getting it wrong files every answer against
 * the wrong question, so the assignment's own response body has to be seen before
 * this is built against — `GET sparents/my-children/{id}/assignments/{id}`,
 * which is refused on this deployment.
 *
 * Re-submitting a completed test is a 409.
 */
export type SubmitAnswersBody = {
  answers: Record<string, number | string>
}
