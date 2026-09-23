import type { ClassArm } from '../class-arms/types.ts'
import type { Department } from '../departments/types.ts'
import type { PageParams } from '../types.ts'
import type { User } from '../users/types.ts'

/** Reference rows the detail endpoint expands alongside the pupil. */
export type Country = {
  id: number
  name: string
  sortname: string
  phonecode: number
}

export type State = { id: number; name: string; country_id: number }

export type Lga = { id: number; name: string }

/** The year of study, as the API's university template names it. */
export type Level = { id: number; name: string }

/** A pupil record. Applicants are the same row with `status: 'Applied'`. */
export type Student = {
  id: number
  user_id: number | null
  fname: string
  lname: string
  mname: string | null
  dob: string | null
  gender: string | null
  email: string | null
  phone: string | null
  address: string | null
  regno: string | null
  application_no: string | null
  joindate: string | null
  admissiondate: string | null
  department_id: number | null
  state_id: number | null
  country_id: number | null
  lga_id: number | null
  community: string | null
  previousschool: string | null
  fathersname: string | null
  mothersname: string | null
  fatherphone: string | null
  motherphone: string | null
  fathersjob: string | null
  mothersjob: string | null
  /** Where they are in admission: Applied, Admitted, … */
  status: string | null
  /** Where they are once admitted: Active, Suspended, … */
  studentstatus: string | null
  passporturl: string | null
  birthcerturl: string | null
  othercerts: string | null
  /** The last school report, where the family uploaded one. */
  olevelresulturl: string | null
  /** The arm they sit in. `class_arm` is expanded by the list endpoint. */
  class_arm_id: number | null
  /** The guardian record, when one has been linked. No name comes with it. */
  sparent_id: number | null
  session_id: number | null
  level_id: number | null
  religion: string | null
  /** Expanded by the list endpoint; absent on the leaner responses. */
  user?: User
  class_arm?: ClassArm
  department?: Department
  level?: Level | null
  /**
   * Only `GET /students/{id}` expands these, and each comes back null where
   * the pupil has no such row — a record entered without one has no state.
   */
  country?: Country | null
  state?: State | null
  lga?: Lga | null
}

export type StudentListParams = PageParams & {
  status?: string
  studentstatus?: string
  department_id?: number
  class_arm_id?: number
  session_id?: number
  /** Name, regno, email or application number. */
  q?: string
}

export type StudentBody = {
  fname: string
  lname: string
  mname?: string
  /** YYYY-MM-DD. */
  dob?: string
  email?: string
  gender?: string
  department_id?: number
  session_id?: number
  status?: string
  studentstatus?: string
  address?: string
  phone?: string
  class_arm_id?: number | string
  sparent_id?: number | string
  religion?: string
  /**
   * The school's own numbering, not any package's — see `country-ids.ts`.
   * Every live pupil is country 160 with a state in the 2646+ range.
   */
  country_id?: number
  state_id?: number
}

/** The API accepts exactly these two words. */
export type SetStudentStatusBody = {
  status: 'Active' | 'Suspended'
}

/** Moves the listed pupils into a class, and into an arm if one is given. */
export type PromoteStudentsBody = {
  student_ids: number[]
  department_id: number
  class_arm_id?: number
}

export type StudentResultParams = {
  session_id?: number
  semester_id?: number
}

export type StudentResult = Record<string, unknown>
