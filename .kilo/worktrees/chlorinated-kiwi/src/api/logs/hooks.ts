import { useQuery } from '@tanstack/react-query'
import type { Id } from '../types'
import { logKeys } from './keys'
import { logsService } from './service'
import type { LogListParams } from './types'

/** The log is append-only, so nothing here writes. */
export function useActivityLogs(params: LogListParams = {}) {
  return useQuery({
    queryKey: logKeys.list(params),
    queryFn: () => logsService.list(params),
  })
}

export function useLogTypes() {
  return useQuery({
    queryKey: logKeys.types(),
    queryFn: () => logsService.types(),
  })
}

export function useActivityLog(id: Id | undefined) {
  return useQuery({
    queryKey: logKeys.detail(id ?? ''),
    queryFn: () => logsService.get(id!),
    enabled: id !== undefined,
  })
}
