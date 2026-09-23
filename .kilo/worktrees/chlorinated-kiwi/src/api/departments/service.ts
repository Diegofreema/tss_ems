import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  AddSubjectsBody,
  AllocateToClassBody,
  ClassArmSummary,
  ClassSubject,
  Department,
  DepartmentBody,
  DepartmentListParams,
  DepartmentOptions,
} from './types'

export const departmentsService = {
  list: (params: DepartmentListParams = {}) =>
    request<Record<string, unknown>>('departments', { query: { ...params } }).then((data) =>
      paginated<Department>(data, 'departments'),
    ),

  options: () => request<DepartmentOptions>('departments/options'),

  /**
   * With its subjects, arms, fees, levels, terms and dependency counts.
   *
   * `dependencies` sits beside the class in the envelope rather than on it,
   * and it is the only place the student count is stated — the class carries no
   * student list to fall back on. It is folded onto the record here so callers
   * read one object.
   */
  get: (id: Id) =>
    request<{ department: Department; dependencies?: Record<string, number> }>(
      `departments/${id}`,
    ).then(({ department, dependencies }) => ({ ...department, dependencies })),

  subjects: (id: Id) =>
    request<{ subjects: ClassSubject[] }>(`departments/${id}/subjects`).then(
      (data) => data.subjects,
    ),

  classArms: (id: Id) =>
    request<{ class_arms: ClassArmSummary[] }>(`departments/${id}/class-arms`).then(
      (data) => data.class_arms,
    ),

  create: (body: DepartmentBody) =>
    request<{ department: Department }>('departments', { method: 'POST', body }),

  update: (id: Id, body: DepartmentBody) =>
    request<{ department: Department }>(`departments/${id}`, { method: 'POST', body }),

  addSubjects: (id: Id, body: AddSubjectsBody) =>
    request<unknown>(`departments/${id}/subjects`, { method: 'POST', body }),

  allocate: (id: Id, body: AllocateToClassBody) =>
    request<unknown>(`departments/${id}/allocate`, { method: 'POST', body }),

  /** Removes the subject from this class only, never its home class. */
  removeSubject: (id: Id, subjectId: Id) =>
    request<unknown>(`departments/${id}/subjects/${subjectId}`, { method: 'DELETE' }),

  /**
   * Refused with 409 while anything belongs to the class, counts in
   * `errors.dependencies`. `force` orphans those rows — and `students
   * .department_id` is NOT NULL, so an orphaned student stops loading anywhere
   * that joins their class.
   */
  remove: (id: Id, force = false) =>
    request<unknown>(`departments/${id}`, {
      method: 'DELETE',
      query: { force: force ? 1 : undefined },
    }),

  /** The plain level list behind the admin class dropdowns. */
  classes: () => request<Record<string, unknown>>('admins/classes'),
}
