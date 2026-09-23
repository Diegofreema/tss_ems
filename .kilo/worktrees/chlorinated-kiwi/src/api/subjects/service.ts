import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  AssignTeachersBody,
  SetSubjectClassesBody,
  Subject,
  SubjectBody,
  SubjectListParams,
  SubjectOptions,
} from './types'

export const subjectsService = {
  list: (params: SubjectListParams = {}) =>
    request<Record<string, unknown>>('subjects', { query: { ...params } }).then((data) =>
      paginated<Subject>(data, 'subjects'),
    ),

  options: () => request<SubjectOptions>('subjects/options'),

  /** `dependencies` is a sibling of the subject in the envelope, not a field. */
  get: (id: Id) =>
    request<{ subject: Subject; dependencies?: Record<string, number> }>(
      `subjects/${id}`,
    ).then(({ subject, dependencies }) => ({ ...subject, dependencies })),

  create: (body: SubjectBody) =>
    request<{ subject: Subject }>('subjects', { method: 'POST', body }),

  update: (id: Id, body: SubjectBody) =>
    request<{ subject: Subject }>(`subjects/${id}`, { method: 'POST', body }),

  /** Stops the subject being offered without touching what it already holds. */
  deactivate: (id: Id) => request<unknown>(`subjects/${id}/deactivate`, { method: 'POST' }),

  activate: (id: Id) => request<unknown>(`subjects/${id}/activate`, { method: 'POST' }),

  assignTeachers: (id: Id, body: AssignTeachersBody) =>
    request<unknown>(`subjects/${id}/teachers`, { method: 'POST', body }),

  setClasses: (id: Id, body: SetSubjectClassesBody) =>
    request<unknown>(`subjects/${id}/classes`, { method: 'POST', body }),

  /**
   * Refused with 409 while results, materials, topics or CBT assignments reference
   * it, with the counts in `errors.dependencies`.
   */
  remove: (id: Id, force = false) =>
    request<unknown>(`subjects/${id}`, {
      method: 'DELETE',
      query: { force: force ? 1 : undefined },
    }),
}
