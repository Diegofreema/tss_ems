import type { PageParams } from '../types.ts'

export type Subject = {
  id: number
  name: string
  subjectcode: string
  /** The subject's home class; it may also be taught to others. */
  department_id: number
  /** Expanded beside the id on every response, so no name feed is needed. */
  department?: string | null
  creditload: number | null
  /** Comes back null when the row carries 0. */
  semester_id: number | null
  semester?: string | null
  level_id: number | null
  level?: string | null
  status: number
  is_active?: boolean
  created_date?: string
  /** Detail only: every class it is taught to, the home one flagged. */
  classes?: SubjectClass[]
  /** Detail only. One joined name — not first and last separately. */
  teachers?: { id: number; name: string }[]
  /** Sits beside the subject in the detail envelope; folded on by the service. */
  dependencies?: Record<string, number>
}

export type SubjectClass = {
  id: number
  name: string
  /** The class it can never stop being taught to. */
  is_home: boolean
}

export type SubjectListParams = PageParams & {
  department_id?: number
  /** 1 for active, 0 for inactive. */
  status?: 0 | 1
  /** Matches the name or the subject code. */
  q?: string
}

/** Classes, levels, terms and teachers for the subject forms. */
export type SubjectOptions = Record<string, unknown>

/**
 * `subjectcode` is generated from the name when left out. The name must be
 * unique within its class. On update, a field left out is untouched.
 */
export type SubjectBody = {
  name?: string
  subjectcode?: string
  department_id?: number
  creditload?: number
  semester_id?: number
  level_id?: number
  teachers?: number[]
}

/** Replaces the whole set, so `[]` clears it. */
export type AssignTeachersBody = {
  teachers: number[]
}

/**
 * Replaces the whole set. The home class is always kept whether listed or
 * not, so a subject can never end up taught to nobody.
 */
export type SetSubjectClassesBody = {
  classes: number[]
}
