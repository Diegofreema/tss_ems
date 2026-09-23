import type { Id } from '../types'
import type { StaffListParams } from './types'

export const teacherKeys = {
  all: ['teachers'] as const,
  lists: () => [...teacherKeys.all, 'list'] as const,
  list: (params: StaffListParams) => [...teacherKeys.lists(), params] as const,
  details: () => [...teacherKeys.all, 'detail'] as const,
  detail: (id: Id) => [...teacherKeys.details(), String(id)] as const,
}
