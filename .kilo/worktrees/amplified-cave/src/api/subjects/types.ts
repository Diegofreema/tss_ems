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
  /** The one home class. A **number** — see `department_ids` below. */
  department_id?: number
  /**
   * Several classes, and it means **one subject per class**, not one subject
   * taught to several.
   *
   * Measured against bronze on 2026-09-18, because the difference is not
   * guessable and the wrong guess is silent:
   *
   * - `department_ids: [1, 4, 5]` → 201, `created: 3`, and three separate
   *   subject rows come back, each with its own home class. The school names
   *   them itself: "Mathematics - JSS I", "Mathematics - JSS II",
   *   "Mathematics - JSS III", which is also what keeps each name unique
   *   within its class.
   * - `department_id: [1, 4, 5]` — an array under the *singular* key, which
   *   is the obvious thing to try — answers **201 and makes one subject with
   *   `department_id: 0` and no classes at all**. No error, no warning: a
   *   subject belonging to no class, which the register then draws with an
   *   empty Class column. It is the worst of the three outcomes and the
   *   easiest to ship.
   * - One subject taught to several classes is a different thing again, and
   *   it is `department_id` plus `classes: [...]` — or the "Teach to classes"
   *   flow, which is where this app does it.
   *
   * The answer carries `subjects`, `created` and `failed` beside the usual
   * `subject`; the create handler reads those out so the office is told how
   * many it got.
   */
  department_ids?: number[]
  creditload?: number
  semester_id?: number
  level_id?: number
  teachers?: number[]
}

/**
 * What `POST /subjects` answers with once it may create several.
 *
 * `subject` is still the first one, so every older reader goes on working;
 * `created` counts them and `failed` names the ones a rule refused — a name
 * already taken in that class is the one to expect.
 */
export type SubjectCreated = {
  subject?: Subject | null
  subjects?: Subject[] | null
  created?: number | null
  failed?: unknown[] | null
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
