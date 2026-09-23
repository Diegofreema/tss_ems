import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionKeys, termKeys } from '../calendar/keys'
import { settingsKeys } from './keys'
import { settingsService } from './service'
import type { SettingsBody } from './types'

export function useSchoolSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: () => settingsService.get(),
    // Every screen reads these, and the office changes them once a term.
    staleTime: 10 * 60_000,
  })
}

export function useSettingsOptions() {
  return useQuery({
    queryKey: settingsKeys.options(),
    queryFn: () => settingsService.options(),
    staleTime: Infinity,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SettingsBody) => settingsService.update(body),
    meta: { success: 'Settings saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  })
}

/**
 * Moving the current session moves what every unfiltered screen shows, so the
 * whole cache is dropped rather than picked over.
 */
export function useSetCurrentSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => settingsService.setCurrentSession(sessionId),
    meta: { success: 'Current session changed' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      queryClient.invalidateQueries({ queryKey: sessionKeys.all })
      queryClient.invalidateQueries()
    },
  })
}

export function useSetCurrentTerm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (semesterId: number) => settingsService.setCurrentTerm(semesterId),
    meta: { success: 'Current term changed' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      queryClient.invalidateQueries({ queryKey: termKeys.all })
      queryClient.invalidateQueries()
    },
  })
}
