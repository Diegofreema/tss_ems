import type { Id } from '../types'
import type { DepartmentListParams } from './types'

export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (params: DepartmentListParams) => [...departmentKeys.lists(), params] as const,
  options: () => [...departmentKeys.all, 'options'] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: Id) => [...departmentKeys.details(), String(id)] as const,
  subjects: (id: Id) => [...departmentKeys.detail(id), 'subjects'] as const,
  classArms: (id: Id) => [...departmentKeys.detail(id), 'class-arms'] as const,
  classes: () => [...departmentKeys.all, 'classes'] as const,
}
