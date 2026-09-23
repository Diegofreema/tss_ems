import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { timetableKeys } from './keys'
import { timetablesService } from './service'
import type {
  ChildrenParams,
  PeriodBody,
  PeriodEditBody,
  PeriodParams,
  TermParams,
} from './types'

/**
 * Reading and setting the class timetable. Nothing here is wired into a page
 * yet.
 */

/** The student's own grid. Pass both term ids together for a past term. */
export function useMyTimetable(params: TermParams = {}) {
  return useQuery({
    queryKey: timetableKeys.mine(params),
    queryFn: () => timetablesService.mine(params),
  })
}

/** A guardian's children, each with their own grid. */
export function useChildrenTimetables(params: ChildrenParams = {}) {
  return useQuery({
    queryKey: timetableKeys.children(params),
    queryFn: () => timetablesService.children(params),
  })
}

/**
 * The classes this account may open. The picker is built from this rather than
 * from the caller's role — the server already knows the answer.
 */
export function useTimetableClasses() {
  return useQuery({
    queryKey: timetableKeys.classes(),
    queryFn: () => timetablesService.classes(),
  })
}

/** One class's grid. Disabled until a class is picked. */
export function useClassTimetable(id: Id | undefined, params: TermParams = {}) {
  return useQuery({
    queryKey: timetableKeys.forClass(String(id), params),
    queryFn: () => timetablesService.forClass(id as Id, params),
    enabled: id !== undefined && id !== '',
  })
}

/** Every period in the school, flat and paged. The office only. */
export function usePeriods(params: PeriodParams = {}) {
  return useQuery({
    queryKey: timetableKeys.periods(params),
    queryFn: () => timetablesService.periods(params),
  })
}

export function usePeriod(id: Id | undefined) {
  return useQuery({
    queryKey: timetableKeys.period(String(id)),
    queryFn: () => timetablesService.period(id as Id),
    enabled: id !== undefined && id !== '',
  })
}

/**
 * The three writers all invalidate the whole root: a period added to a class
 * changes that class's grid, every student's `mine`, and the office's flat list.
 *
 * A clash answers 409 and the client turns it into an `ApiError` whose message
 * is the school's own sentence, so the default error toast already says what
 * went wrong. Nothing here needs `ownsError` unless a form wants it inline.
 */
export function useAddPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PeriodBody) => timetablesService.addPeriod(body),
    meta: { success: 'Period added to the timetable' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  })
}

export function useEditPeriod(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PeriodEditBody) => timetablesService.editPeriod(id, body),
    meta: { success: 'Period updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  })
}

export function useRemovePeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => timetablesService.removePeriod(id),
    meta: { success: 'Period removed' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  })
}
