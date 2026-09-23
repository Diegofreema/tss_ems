import type { Id } from '../types'
import type { ClassArmListParams } from './types'

export const classArmKeys = {
  all: ['class-arms'] as const,
  lists: () => [...classArmKeys.all, 'list'] as const,
  list: (params: ClassArmListParams) => [...classArmKeys.lists(), params] as const,
  options: () => [...classArmKeys.all, 'options'] as const,
  forDepartment: (departmentId: Id) =>
    [...classArmKeys.all, 'for-department', String(departmentId)] as const,
  details: () => [...classArmKeys.all, 'detail'] as const,
  detail: (id: Id) => [...classArmKeys.details(), String(id)] as const,
  students: (id: Id, all: boolean) => [...classArmKeys.detail(id), 'students', all] as const,
}
