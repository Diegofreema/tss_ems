import type { Id } from '../types'
import type { StudentListParams, StudentResultParams } from './types'

export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (params: StudentListParams) => [...studentKeys.lists(), params] as const,
  applicants: (sessionId?: number) => [...studentKeys.all, 'applicants', sessionId] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: Id) => [...studentKeys.details(), String(id)] as const,
  invoices: (id: Id) => [...studentKeys.detail(id), 'invoices'] as const,
  results: (id: Id, params: StudentResultParams) =>
    [...studentKeys.detail(id), 'results', params] as const,
}
