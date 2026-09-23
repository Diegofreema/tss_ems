import { useQuery } from '@tanstack/react-query'
import { resultKeys } from './keys'
import { resultsService } from './service'
import type { ClassSheetParams } from './types'

/*
 * Only the broadsheet is read through a hook. The office's register and its
 * queue are collections, and a collection reads itself through its own
 * `source`; the writes are the collection's `save`, `remove` and `rowAction`,
 * and the two batch decisions are flows. Adding hooks nothing calls would be
 * adding a second way to do all of it.
 */

/** Idle until a class is chosen — `department_id` is required. */
export function useClassSheet(params: Partial<ClassSheetParams>) {
  const ready = params.department_id !== undefined
  return useQuery({
    queryKey: resultKeys.classSheet(params as ClassSheetParams),
    queryFn: () => resultsService.classSheet(params as ClassSheetParams),
    enabled: ready,
  })
}
