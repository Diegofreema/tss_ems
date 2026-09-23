import type { Id } from '../types'
import type { ClassSheetParams, MarkListParams, MyMarkParams } from './types'

/**
 * One root for the register and the queue: releasing a batch changes both, and
 * one `invalidateQueries({ queryKey: resultKeys.all })` covers them.
 */
export const resultKeys = {
  all: ['results'] as const,
  list: (params: MarkListParams) => [...resultKeys.all, 'list', params] as const,
  detail: (id: Id) => [...resultKeys.all, 'detail', String(id)] as const,
  pending: () => [...resultKeys.all, 'pending'] as const,
  classSheet: (params: ClassSheetParams) => [...resultKeys.all, 'sheet', params] as const,
  /** Scoped to the token, so no id appears in it. */
  mine: (params: MyMarkParams) => [...resultKeys.all, 'mine', params] as const,
  children: () => [...resultKeys.all, 'children'] as const,
  student: (studentId: Id, params: MyMarkParams) =>
    [...resultKeys.all, 'student', String(studentId), params] as const,
}
