import type { ChildrenParams, PeriodParams, TermParams } from './types'

/**
 * `mine`, `children` and `classes` are scoped to the token, so no id is in
 * their keys. Everything hangs off one root: adding, editing or removing a
 * period changes the grid a pupil reads, and one
 * `invalidateQueries({ queryKey: timetableKeys.all })` covers both.
 */
export const timetableKeys = {
  all: ['timetables'] as const,
  mine: (params: TermParams) => [...timetableKeys.all, 'mine', params] as const,
  children: (params: ChildrenParams) => [...timetableKeys.all, 'children', params] as const,
  classes: () => [...timetableKeys.all, 'classes'] as const,
  forClass: (id: string, params: TermParams) =>
    [...timetableKeys.all, 'class', id, params] as const,
  periods: (params: PeriodParams) => [...timetableKeys.all, 'periods', params] as const,
  period: (id: string) => [...timetableKeys.all, 'period', id] as const,
}
