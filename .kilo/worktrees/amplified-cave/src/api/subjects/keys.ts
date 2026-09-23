import type { Id } from '../types'
import type { SubjectListParams } from './types'

export const subjectKeys = {
  all: ['subjects'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (params: SubjectListParams) => [...subjectKeys.lists(), params] as const,
  options: () => [...subjectKeys.all, 'options'] as const,
  details: () => [...subjectKeys.all, 'detail'] as const,
  detail: (id: Id) => [...subjectKeys.details(), String(id)] as const,
}
