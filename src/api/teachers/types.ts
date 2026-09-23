import type { PageParams, Place } from '../types.ts'
import type { User } from '../users/types.ts'

/** A class, as the API expands it beside a staff record or a subject. */
export type StaffDepartment = {
  id: number
  name: string
  deptcode: string | null
}

/**
 * A subject the teacher carries. Each arrives with the class it is taught in
 * already expanded, so a teacher's subjects need no second call to be read.
 */
export type TeacherSubject = {
  id: number
  name: string
  subjectcode: string | null
  department_id: number | null
  /** 1 while the subject is in use. */
  status: number
  department?: StaffDepartment | null
}

/**
 * An arm a teacher is class teacher of, expanded on both the list and the
 * detail. The label already reads "JSS 1 JSS1 A" — class then arm — and a
 * teacher can be class teacher of more than one, so this is an array.
 */
export type TeacherArm = {
  id: number
  arm_name: string
  class: string | null
  department_id: number | null
  label: string
  status: string | null
}

export type Teacher = {
  id: number
  user_id: number
  firstname: string
  lastname: string
  middlename: string | null
  gender: string | null
  address: string | null
  country_id: number | null
  state_id: number | null
  phone: string | null
  profile: string | null
  cv: string | null
  qualification: string | null
  date_created: string
  passport: string | null
  department_id: number | null
  staffgrade_id: number | null
  staffdepartment_id: number | null
  /** The API spells this Yes/No rather than as a boolean. */
  isadviser: 'Yes' | 'No'
  /**
   * Expanded by `GET /teachers/{id}` alone — the list sends `department_id`
   * and nothing else, so a row read off the register knows no class name.
   */
  department?: StaffDepartment | null
  /** Detail only, and the only place the school says what a teacher teaches. */
  subjects?: TeacherSubject[]
  /**
   * The arms this teacher is class teacher of. Both the list and the detail
   * expand them; empty where the office has put them in front of no arm.
   */
  class_arms?: TeacherArm[]
  /** True where `class_arms` is non-empty — the API's own convenience flag. */
  is_form_teacher?: boolean
  state?: Place | null
  country?: Place | null
  /** The login behind the record. Both the list and the detail expand it. */
  user?: User | null
}

export type StaffListParams = PageParams & {
  /** Matches first name, last name or username. */
  q?: string
}

/**
 * Creates the login and the staff record together. The account starts Enabled
 * on the default password, to be changed on first sign-in.
 */
export type CreateStaffBody = {
  username: string
  firstname: string
  lastname: string
  /** Null where they have none; sent rather than dropped so an edit can clear it. */
  middlename?: string | null
  gender?: string
  address?: string
  phone?: string
  country_id?: number
  state_id?: number
  department_id?: number
  qualification?: string
  profile?: string
  /**
   * `YYYY-MM-DD`. The teaching record has no birthday column of its own — the
   * endpoint writes this onto the login beside it, the same place the middle
   * name goes — and `teacherRow` reads it back from `user.dob`.
   */
  dob?: string
  /**
   * The arm to make them class teacher of. A string id as the select holds it;
   * `POST /teachers` takes it here, and `POST /teachers/{id}` reassigns with it.
   */
  class_arm_id?: number | string
}

/** The same fields on an edit, all optional — `class_arm_id` reassigns the arm. */
export type UpdateStaffBody = Partial<CreateStaffBody>

/** Replaces the teacher's subject set with exactly these ids. */
export type AssignSubjectsBody = {
  subjects: number[]
}

/** An empty `user_ids` mails every member of staff. */
export type MailStaffBody = {
  user_ids: number[]
  subject: string
  message: string
}
