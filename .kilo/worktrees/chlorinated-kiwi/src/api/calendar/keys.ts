import type { Id } from '../types'
import type { CalendarListParams } from './types'

function calendarKeys(scope: 'sessions' | 'terms') {
  const all = [scope] as const
  return {
    all,
    lists: () => [...all, 'list'] as const,
    list: (params: CalendarListParams) => [...all, 'list', params] as const,
    current: () => [...all, 'current'] as const,
    detail: (id: Id) => [...all, 'detail', String(id)] as const,
  }
}

export const sessionKeys = calendarKeys('sessions')
export const termKeys = calendarKeys('terms')
