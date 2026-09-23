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
  middlename?: string
  gender?: string
  address?: string
  phone?: string
  country_id?: number
  state_id?: number
  department_id?: number
  qualification?: string
  profile?: string
}

export type UpdateStaffBody = Partial<CreateStaffBody> & {
  /** Reassigns which arm they take. */
  class_arm_id?: number
}

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
