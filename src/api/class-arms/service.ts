import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  ArmOption,
  ArmStudents,
  AssignStudentsBody,
  AssignStudentsResult,
  ClassArm,
  ClassArmBody,
  ClassArmListParams,
  ClassArmOptions,
} from './types'

export const classArmsService = {
  list: (params: ClassArmListParams = {}) =>
    request<Record<string, unknown>>('class-arms', { query: { ...params } }).then((data) =>
      paginated<ClassArm>(data, 'class_arms'),
    ),

  options: () => request<ClassArmOptions>('class-arms/options'),

  /** The dropdown feed the teacher screens use; names only. */
  forDepartment: (departmentId: Id) =>
    request<{ class_arms: ArmOption[] }>(`class-arms/for-department/${departmentId}`).then(
      (data) => data.class_arms,
    ),

  /**
   * `dependencies` — students, results, attendances — is a sibling of the arm in
   * the envelope, not a field on it, and the arm's own `students` is null here.
   * Folding it on is what keeps the roll readable off one object.
   */
  get: (id: Id) =>
    request<{ class_arm: ClassArm; dependencies?: Record<string, number> }>(
      `class-arms/${id}`,
    ).then(({ class_arm, dependencies }) => ({ ...class_arm, dependencies })),

  create: (body: ClassArmBody) =>
    request<{ class_arm: ClassArm }>('class-arms', { method: 'POST', body }),

  update: (id: Id, body: ClassArmBody) =>
    request<{ class_arm: ClassArm }>(`class-arms/${id}`, { method: 'POST', body }),

  /** `all` widens the list to students who are not admitted. */
  students: (id: Id, all = false) =>
    request<ArmStudents>(`class-arms/${id}/students`, { query: { all: all ? 1 : undefined } }),

  assignStudents: (id: Id, body: AssignStudentsBody) =>
    request<AssignStudentsResult>(`class-arms/${id}/students`, { method: 'POST', body }),

  /** The student must actually be in this arm; another arm's id is refused. */
  removeStudent: (id: Id, classArmStudentId: Id) =>
    request<unknown>(`class-arms/${id}/students/${classArmStudentId}`, { method: 'DELETE' }),

  /**
   * Refused with 409 while students, results or attendance point at the arm.
   * `force` deletes anyway and leaves those rows pointing at nothing.
   */
  remove: (id: Id, force = false) =>
    request<unknown>(`class-arms/${id}`, {
      method: 'DELETE',
      query: { force: force ? 1 : undefined },
    }),
}
