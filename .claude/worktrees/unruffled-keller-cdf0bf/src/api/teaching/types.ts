import type { ClassArm } from '../class-arms/types.ts'
import type { Paginated, PageParams } from '../types.ts'
import type { Student } from '../students/types.ts'
import type {
  StaffDepartment,
  Teacher,
  TeacherSubject as SubjectRecord,
} from '../teachers/types.ts'

export type { Teacher }

/**
 * An arm on the teacher's own record. The same row the register sends, except
 * that here the class comes expanded rather than as a name.
 */
export type TeacherClassArm = Omit<ClassArm, 'department'> & {
  department?: StaffDepartment | null
}

/**
 * `GET /teachers/me` — the record, with the arms the teacher is class teacher
 * of sitting beside it rather than on it. Unlike `/users/me`, this one reads
 * the token, so it is the only endpoint that says which teacher is looking.
 */
export type MyTeachingProfile = {
  teacher: Teacher
  /** Empty for a teacher who takes no arm; more than one is normal. */
  class_arms: TeacherClassArm[]
}

/** Photo and CV are file rows; role, subjects and grade cannot be changed here. */
export type UpdateMyTeachingProfileBody = {
  phone?: string
  address?: string
  passports?: File
  ccv?: File
}

/**
 * The home page's counters. `my_students` counts the pupils in the arms this
 * teacher takes, against `total_students` for the whole school;
 * `pending_assignments` counts the assignments they have set that are still open —
 * it reads 0 for a teacher whose two assignments both closed before today.
 */
export type TeacherDashboardStats = {
  my_students: number
  total_students: number
  my_subjects: number
  pending_assignments: number
  attendance_taken_today: boolean
}

/**
 * An assignment the teacher has set, as the dashboard lists it.
 *
 * The two stamps are the same wall clock written two ways — `opendate` carries
 * the school's `+01:00` and `closedate` carries no zone at all — so the offset
 * is dropped rather than believed; see `schoolTime`.
 */
export type SetAssignment = {
  id: number
  title: string | null
  details: string | null
  subject_id: number
  department_id: number
  /** 'cbt_test' on every assignment set so far. */
  test_type: string | null
  status: string | null
  total_questions: number | null
  /** Minutes allowed once opened. Null on an assignment with no limit set. */
  time_limit: number | null
  passing_score: number | null
  opendate: string | null
  closedate: string | null
  /** Expanded beside the assignment, so the subject needs no second call. */
  subject?: { id: number; name: string; subjectcode: string | null } | null
}

export type TeacherDashboard = {
  stats: TeacherDashboardStats
  /** Newest first. Empty for a teacher who has set nothing. */
  recent_assignments: SetAssignment[]
  class_arms: TeacherClassArm[]
}
/**
 * A subject the office has given this teacher, as `/teachers/me/subjects`
 * sends it: the subject row with its class expanded, and the join row saying
 * when it was handed over. The endpoint takes no parameters and answers whole.
 */
export type TeacherSubject = SubjectRecord & {
  _joinData?: {
    id: number
    teacher_id: number
    subject_id: number
    created_date: string
  }
}

/**
 * A pupil on the teacher's roll — the whole pupil record, with the arm, the
 * class and the login expanded.
 */
export type TeacherStudent = Student

/**
 * The roll, with the arms it was drawn from beside it. An arm the teacher
 * takes but which holds nobody appears here and in no pupil's row, which is
 * why the two are read separately.
 */
export type TeacherRoll = Paginated<TeacherStudent> & {
  class_arms: TeacherClassArm[]
}

/**
 * One mark, as `/teachers/me/results` sends it. The subject arrives as an id
 * alone — the teacher's own subject list is what puts a name to it.
 *
 * Money-style strings: `score`, `total` and the three exam columns come back
 * quoted, so each is read as a number rather than believed as text.
 */
export type TeacherResult = {
  id: number
  student_id: number
  regno: string | null
  subject_id: number
  class_arm_id: number | null
  session_id: number | null
  semester_id: number | null
  ca: string | number | null
  score: string | number | null
  total: string | number | null
  grade: string | null
  remark: string | null
  /** 'pending' until the office approves the batch it arrived in. */
  approval_status: string | null
  uploaddate: string | null
  /**
   * What the office did and when. `uploaddate` is when the mark was filed, so
   * it is the only stamp a pending mark has; `approved_at` is the only stamp
   * for the decision itself, and a mark sent back carries the reason rather
   * than a date. All three are null across the register today.
   */
  approved_at?: string | null
  approved_by?: number | null
  rejection_reason?: string | null
  /**
   * The three exam sittings an uploaded sheet is summed from. `score` is their
   * total, which is why a stored exam mark can sit above the 60 the entry form
   * accepts. All three are zero on a mark typed into the score sheet.
   */
  first_exam?: string | number | null
  second_exam?: string | number | null
  third_exam?: string | number | null
  /**
   * Expanded beside the ids. The session and the term are the only place a
   * teacher can read either — `/sessions`, `/semesters` and `/settings` all
   * answer "restricted to administrators" for a teaching login.
   */
  session?: { id: number; name: string } | null
  semester?: { id: number; name: string } | null
  subject?: { id: number; name: string; subjectcode: string | null } | null
  department?: { id: number; name: string; deptcode: string | null } | null
  student?: Student | null
  /**
   * Who filed the mark, which is not always the teacher reading it: a batch
   * uploaded by the office carries the office's own account.
   */
  user?: { id: number; fname: string | null; lname: string | null } | null
}

/**
 * An online session. The endpoint answers under `classes`, not `eclasses`, and
 * a row is the meeting link and the day it was made — no title, no arm, no
 * schedule and no materials, whatever a timetable would want.
 */
export type EClass = {
  id: number
  meetinglink: string | null
  teacher_id: number
  datecreated: string | null
}

/** `subject_id` is required; the rest narrow the cohort. */
export type RegisteredStudentParams = {
  subject_id: number
  session_id?: number
  semester_id?: number
  level_id?: number
}

export type MessageAdminBody = {
  subject: string
  message: string
}

/** An empty `student_ids` mails the caller's whole department. */
export type MessageStudentsBody = MessageAdminBody & {
  student_ids: number[]
}

/**
 * A results spreadsheet. Columns are A regno, B CA, C 1st exam, D 2nd exam,
 * E 3rd exam. The batch lands as `pending` for admin approval.
 */
export type UploadResultsBody = {
  result: File
  department_id: number
  subject_id: number
  semester_id: number
  session_id: number
  class_arm_id: number
}

/** Which batch to open — the four ids that group an upload. */
export type UploadBatchKey = {
  subjectId: number
  departmentId: number
  semesterId: number
  sessionId: number
}

export type UploadBatch = Record<string, unknown>
export type ResultRow = Record<string, unknown>

export type MyResultParams = PageParams & {
  subject_id?: number
  session_id?: number
  semester_id?: number
}

/** CA is capped at 40 and exam at 60; grade and remark are derived server-side. */
export type EnterScoreBody = {
  student_id: number
  subject_id: number
  session_id: number
  semester_id: number
  ca: number
  exam: number
}

export type Topic = {
  id: number
  subject_id: number
  title: string
  contents: string
}

export type CreateTopicBody = {
  subject_id: number
  title: string
  contents: string
}

export type UpdateTopicBody = Partial<Omit<CreateTopicBody, 'subject_id'>>
