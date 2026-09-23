import type { PageParams } from '../types.ts'
import type { Student } from '../students/types.ts'

/** A stream a class is split into — JSS 1 A, JSS 1 B. */
export type ClassArm = {
  id: number
  department_id: number
  /** Expanded beside the id on every response, so no name feed is needed. */
  department?: string | null
  arm_name: string
  arm_description: string | null
  class_teacher_id: number | null
  class_teacher?: string | null
  /**
   * The roll, on the list. The detail sends `null` here and puts the count in
   * `dependencies.students` instead, so read them in that order.
   */
  students?: number | null
  status: ClassArmStatus
  created?: string
  modified?: string
  /** Sits beside the arm in the detail envelope; folded on by the service. */
  dependencies?: Record<string, number>
}

export type ClassArmStatus = 'active' | 'inactive' | 'archived'

export type ClassArmListParams = PageParams & {
  department_id?: number
  status?: ClassArmStatus
  q?: string
}

/** Classes, teachers and the three valid statuses. */
export type ClassArmOptions = Record<string, unknown>

/**
 * `arm_name` is at most 10 characters and unique within the class. An empty
 * `class_teacher_id` is stored as null; an unrecognised status defaults to
 * active.
 */
export type ClassArmBody = {
  department_id?: number
  arm_name: string
  arm_description?: string
  class_teacher_id?: number | ''
  status?: ClassArmStatus
}

export type ArmStudents = {
  students: Student[]
  /** Admitted students of the same class not yet placed in any arm. */
  unassigned_in_class: Student[]
}

/**
 * Each id is judged separately; the response reports what was assigned and
 * what failed. A student may only join an arm of their own class.
 */
export type AssignStudentsBody = {
  student_ids: number[]
}

export type AssignStudentsResult = {
  assigned: number[]
  failed: { student_id: number; reason: string }[]
}

/**
 * The dropdown feed. `label` already reads "JSS 1 - JSS1 A" — class and arm
 * together — because an arm name alone does not identify one.
 */
export type ArmOption = {
  id: number
  label: string
}
