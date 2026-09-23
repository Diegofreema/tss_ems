import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { sessionKeys, termKeys } from './keys'
import { sessionsService, termsService } from './service'
import type { CalendarBody, CalendarListParams } from './types'

type CalendarService = typeof sessionsService
type CalendarKeys = typeof sessionKeys

/**
 * One set of hooks over both resources. Each pair below is a thin named
 * binding, so a screen reads `useSessions()` rather than a generic call with
 * a string argument. The noun is passed in so the toasts name the thing that
 * actually changed rather than "record".
 */
function calendarHooks(service: CalendarService, keys: CalendarKeys, noun: 'Session' | 'Term') {
  return {
    useList: (params: CalendarListParams = {}) =>
      useQuery({ queryKey: keys.list(params), queryFn: () => service.list(params) }),

    useCurrent: () =>
      useQuery({ queryKey: keys.current(), queryFn: () => service.current() }),

    useOne: (id: Id | undefined) =>
      useQuery({
        queryKey: keys.detail(id ?? ''),
        queryFn: () => service.get(id!),
        enabled: id !== undefined,
      }),

    useCreate: () => {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: (body: CalendarBody) => service.create(body),
        meta: { success: `${noun} created` },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      })
    },

    useRename: (id: Id) => {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: (body: CalendarBody) => service.rename(id, body),
        meta: { success: `${noun} renamed` },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      })
    },

    useRemove: () => {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: ({ id, force }: { id: Id; force?: boolean }) => service.remove(id, force),
        meta: { success: `${noun} deleted` },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
      })
    },
  }
}

const sessions = calendarHooks(sessionsService, sessionKeys, 'Session')
const terms = calendarHooks(termsService, termKeys, 'Term')

export const useSessions = sessions.useList
export const useCurrentSession = sessions.useCurrent
export const useSession = sessions.useOne
export const useCreateSession = sessions.useCreate
export const useRenameSession = sessions.useRename
export const useDeleteSession = sessions.useRemove

export const useTerms = terms.useList
export const useCurrentTerm = terms.useCurrent
export const useTerm = terms.useOne
export const useCreateTerm = terms.useCreate
export const useRenameTerm = terms.useRename
export const useDeleteTerm = terms.useRemove
