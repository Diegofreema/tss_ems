import type { PageParams } from '../types.ts'

/**
 * The table is called `departments`, but a row is a class — JSS 1, JSS II.
 * The API's name is kept so the wire and the code agree.
 */
export type Department = {
  id: number
  name: string
  deptcode: string
  faculty_id: number
  faculty?: string | null
  iscdl?: string
  maxunit?: number | null
  /** Expanded by the detail endpoint only; the list sends the row alone. */
  subjects?: ClassSubject[]
  class_arms?: ClassArmSummary[]
  fees?: NamedRef[]
  levels?: NamedRef[]
  semesters?: NamedRef[]
  programmes?: NamedRef[]
  /** How many rows would break if it were deleted. */
  dependencies?: Record<string, number>
}

/** A fee, level, term or programme as the class detail names it. */
export type NamedRef = { id: number; name: string }

export type DepartmentListParams = PageParams & {
  /** Matches the name or the class code. */
  q?: string
  faculty_id?: number
}

/**
 * Faculties, fees, levels, terms, subjects and programmes for the forms, each
 * as an id-to-name map. This is also the only live feed of the subject
 * catalogue while the `subjects` controller is undeployed.
 */
export type DepartmentOptions = {
  faculties?: Record<string, string>
  fees?: Record<string, string>
  levels?: Record<string, string>
  semesters?: Record<string, string>
  subjects?: Record<string, string>
  programmes?: Record<string, string>
}

/**
 * `deptcode` is filled from the name when left out. Association keys take
 * plain id arrays and replace the whole set.
 */
export type DepartmentBody = {
  name: string
  deptcode?: string
  fees?: number[]
  subjects?: number[]
  levels?: number[]
  semesters?: number[]
  programmes?: number[]
}

/** Adds these subjects to the class; it does not move their home class. */
export type AddSubjectsBody = {
  subjects: number[]
}

/**
 * Each key present replaces that whole set, so `[]` clears it; keys left out
 * are untouched. Sending none of the four is a 422.
 */
export type AllocateToClassBody = {
  fees?: number[]
  levels?: number[]
  semesters?: number[]
  programmes?: number[]
}

export type ClassSubject = {
  id: number
  name: string
  subjectcode: string | null
  creditload: number | null
  /** 1 is offered, 0 is withdrawn — the same spelling the register uses. */
  status: number | null
  semester?: string | null
  level?: string | null
}

/**
 * Each arm with its class teacher and student count. This is the only feed
 * that answers for arms while the `class-arms` controller is undeployed, so
 * it carries more than the name the list embeds.
 */
export type ClassArmSummary = {
  id: number
  arm_name: string
  description?: string | null
  status: string | null
  class_teacher?: string | null
  students: number
}
