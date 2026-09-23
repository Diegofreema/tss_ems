import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  Child,
  ChildAssignments,
  ChildAttendance,
  ChildAttendanceParams,
  ChildResultParams,
  ChildResults,
  FamilyInvoice,
  Parent,
  ParentBody,
  ParentDashboard,
  ParentListParams,
  SubmitAnswersBody,
} from './types'

/** The admin's view of guardians. */
export const parentsService = {
  list: (params: ParentListParams = {}) =>
    request<Record<string, unknown>>('sparents', { query: { ...params } }).then((data) =>
      paginated<Parent>(data, 'sparents'),
    ),

  /**
   * With the household's children. They sit beside the record in the envelope
   * rather than on it, so returning `data.sparent` alone drops them silently.
   *
   * The two occupations are asked of the directory alongside, because this
   * endpoint does not select them — a household whose father is on record as a
   * trader answers here with no job at all, and the edit form would show the
   * field empty over a value that exists. The directory is allowed to fail:
   * it costs the jobs, not the record.
   */
  get: (id: Id) =>
    Promise.all([
      request<{ sparent: Parent; children?: Child[] }>(`sparents/${id}`),
      request<{ parent: Pick<Parent, 'fathersjob' | 'mothersjob'> }>(
        `admins/parents/${id}`,
      )
        .then((data) => data.parent)
        .catch(() => undefined),
    ]).then(([{ sparent, children }, jobs]) => ({
      ...sparent,
      fathersjob: jobs?.fathersjob ?? null,
      mothersjob: jobs?.mothersjob ?? null,
      children,
    })),

  children: (id: Id) =>
    request<{ children: Child[] }>(`sparents/${id}/children`).then((data) => data.children),

  create: (body: ParentBody) =>
    request<{ sparent: Parent; username: string; password: string }>('sparents', {
      method: 'POST',
      body,
    }),

  /** `user_id` is stripped — re-pointing a guardian would hand over a family. */
  update: (id: Id, body: ParentBody) =>
    request<{ sparent: Parent }>(`sparents/${id}`, { method: 'POST', body }),

  /** Blocks the guardian from signing in; the record and children stay. */
  deactivate: (id: Id) => request<unknown>(`sparents/${id}/deactivate`, { method: 'POST' }),

  activate: (id: Id) => request<unknown>(`sparents/${id}/activate`, { method: 'POST' }),

  /** Deletes the record and the login. Refused with 409 while children remain. */
  remove: (id: Id) => request<unknown>(`sparents/${id}`, { method: 'DELETE' }),

  /** The read-only directory behind the admin parent lookups. */
  directory: () =>
    request<{ parents: Parent[] }>('admins/parents').then((data) => data.parents),

  directoryEntry: (id: Id) => request<Record<string, unknown>>(`admins/parents/${id}`),
}

/**
 * Everything a signed-in guardian sees. The parent is resolved from the token
 * — never from a path parameter — and a child who is not theirs is a 403.
 */
export const myFamilyService = {
  profile: () => request<{ sparent: Parent }>('sparents/me').then((data) => data.sparent),

  dashboard: () => request<ParentDashboard>('sparents/dashboard'),

  children: () =>
    request<{ children: Child[] }>('sparents/my-children').then((data) => data.children),

  /**
   * Every invoice raised against every child on the record, in one call —
   * this is the only endpoint that answers for the household rather than for
   * one student.
   */
  invoices: (params: { page?: number; limit?: number } = {}) =>
    request<Record<string, unknown>>('sparents/my-invoices', { query: { ...params } }).then(
      (data) => paginated<FamilyInvoice>(data, 'invoices'),
    ),

  /**
   * Approved results only, with the sheet's own totals. Both parameters are
   * optional and narrow independently — a session with no term is that whole
   * year, and neither is the current one.
   */
  childResults: (childId: Id, params: ChildResultParams = {}) =>
    request<ChildResults>(`sparents/my-children/${childId}/results`, {
      query: { ...params },
    }),

  /** The rate counts late as attended. An empty range is the current month. */
  childAttendance: (childId: Id, params: ChildAttendanceParams = {}) =>
    request<ChildAttendance>(`sparents/my-children/${childId}/attendance`, {
      query: { ...params },
    }),

  assignments: () =>
    request<{ children: ChildAssignments[] }>('sparents/my-assignments').then(
      (data) => data.children,
    ),

  /**
   * The assignment itself, with its questions. Its response body has not been seen
   * — the route is refused here — so nothing is typed onto it yet and no
   * screen reads it.
   */
  assignment: (childId: Id, setassignmentId: Id) =>
    request<Record<string, unknown>>(
      `sparents/my-children/${childId}/assignments/${setassignmentId}`,
    ),

  submitAssignment: (childId: Id, setassignmentId: Id, body: SubmitAnswersBody) =>
    request<unknown>(
      `sparents/my-children/${childId}/assignments/${setassignmentId}/submit`,
      { method: 'POST', body },
    ),

  assignmentResult: (assignmentId: Id) =>
    request<Record<string, unknown>>(`sparents/my-assignments/${assignmentId}/result`),
}
