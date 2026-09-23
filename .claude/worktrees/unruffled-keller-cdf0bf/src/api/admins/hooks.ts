import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { adminKeys } from './keys'
import { adminsService } from './service'
import type {
  AdminListParams,
  CreateAdminBody,
  SetPrivilegesBody,
  UpdateAdminRecordBody,
} from './types'

export function useAdminRecords(params: AdminListParams = {}) {
  return useQuery({
    queryKey: adminKeys.list(params),
    queryFn: () => adminsService.list(params),
  })
}

export function useMyAdminRecord() {
  return useQuery({
    queryKey: adminKeys.profile(),
    queryFn: () => adminsService.profile(),
  })
}

export function useAdminRecord(id: Id | undefined) {
  return useQuery({
    queryKey: adminKeys.detail(id ?? ''),
    queryFn: () => adminsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateAdminRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAdminBody) => adminsService.create(body),
    meta: { success: 'Administrator added' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.lists() }),
  })
}

export function useUpdateAdminRecord(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAdminRecordBody) => adminsService.update(id, body),
    meta: { success: 'Administrator updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: adminKeys.lists() })
    },
  })
}

export function useDeleteAdminRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => adminsService.remove(id),
    meta: { success: 'Administrator deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  })
}

export function useAdminPrivileges(id: Id | undefined) {
  return useQuery({
    queryKey: adminKeys.privileges(id ?? ''),
    queryFn: () => adminsService.privileges(id!),
    enabled: id !== undefined,
  })
}

export function useSetAdminPrivileges(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetPrivilegesBody) => adminsService.setPrivileges(id, body),
    meta: { success: 'Privileges saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) }),
  })
}

export function useAdminActivityLogs(id: Id | undefined, limit?: number) {
  return useQuery({
    queryKey: adminKeys.activity(id ?? '', limit),
    queryFn: () => adminsService.activityLogs(id!, limit),
    enabled: id !== undefined,
  })
}
