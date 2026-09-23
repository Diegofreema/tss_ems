import type { Id, PageParams } from '../types'
import type { ChildAttendanceParams, ChildResultParams, ParentListParams } from './types'

export const parentKeys = {
  all: ['parents'] as const,
  lists: () => [...parentKeys.all, 'list'] as const,
  list: (params: ParentListParams) => [...parentKeys.lists(), params] as const,
  details: () => [...parentKeys.all, 'detail'] as const,
  detail: (id: Id) => [...parentKeys.details(), String(id)] as const,
  children: (id: Id) => [...parentKeys.detail(id), 'children'] as const,
  directory: () => [...parentKeys.all, 'directory'] as const,
  directoryEntry: (id: Id) => [...parentKeys.directory(), String(id)] as const,
}

/** Scoped to the signed-in guardian, so no parent id appears in the key. */
export const myFamilyKeys = {
  all: ['my-family'] as const,
  profile: () => [...myFamilyKeys.all, 'profile'] as const,
  dashboard: () => [...myFamilyKeys.all, 'dashboard'] as const,
  children: () => [...myFamilyKeys.all, 'children'] as const,
  invoices: (params: PageParams) => [...myFamilyKeys.all, 'invoices', params] as const,
  childResults: (childId: Id, params: ChildResultParams) =>
    [...myFamilyKeys.all, 'child', String(childId), 'results', params] as const,
  childAttendance: (childId: Id, params: ChildAttendanceParams) =>
    [...myFamilyKeys.all, 'child', String(childId), 'attendance', params] as const,
  assignments: () => [...myFamilyKeys.all, 'assignments'] as const,
  assignment: (childId: Id, setassignmentId: Id) =>
    [...myFamilyKeys.all, 'child', String(childId), 'assignment', String(setassignmentId)] as const,
  assignmentResult: (assignmentId: Id) =>
    [...myFamilyKeys.all, 'assignment-result', String(assignmentId)] as const,
}
