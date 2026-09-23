import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveBlob } from '@/lib/download'
import type { Id } from '../types'
import { userKeys } from './keys'
import { usersService } from './service'
import type {
  CreateUserBody,
  SetUserStatusBody,
  UpdateAdminBody,
  UpdateProfileBody,
  UserListParams,
} from './types'

export function useUsersDashboard() {
  return useQuery({
    queryKey: userKeys.dashboard(),
    queryFn: () => usersService.dashboard(),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: () => usersService.roles(),
    // Reference data — it changes when the schema does, not during a session.
    staleTime: Infinity,
  })
}

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersService.list(params),
  })
}

export function useUser(id: Id | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: () => usersService.get(id!),
    enabled: id !== undefined,
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => usersService.remove(id),
    meta: { success: 'Account deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetUserStatusBody) => usersService.setStatus(body),
    meta: { success: 'Account status changed' },
    onSuccess: (_data, body) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(body.id) })
    },
  })
}

export function useFreeEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => usersService.freeEmail(email),
    meta: { success: 'Email address freed' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
  })
}

export function useMyProfile() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => usersService.profile(),
  })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => usersService.updateProfile(body),
    meta: { success: 'Your profile was saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.profile() }),
  })
}

export function useAdmins() {
  return useQuery({
    queryKey: userKeys.admins(),
    queryFn: () => usersService.listAdmins(),
  })
}

export function useAdmin(id: Id | undefined) {
  return useQuery({
    queryKey: userKeys.admin(id ?? ''),
    queryFn: () => usersService.getAdmin(id!),
    enabled: id !== undefined,
  })
}

export function useUpdateAdmin(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAdminBody) => usersService.updateAdmin(id, body),
    meta: { success: 'Administrator updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.admin(id) })
      queryClient.invalidateQueries({ queryKey: userKeys.admins() })
    },
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUserBody) => usersService.createAdmin(body),
    meta: { success: 'Administrator created' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.admins() })
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}

export function useStudentFeeStatus(studentId: Id | undefined) {
  return useQuery({
    queryKey: userKeys.studentFees(studentId ?? ''),
    queryFn: () => usersService.studentFees(studentId!),
    enabled: studentId !== undefined,
  })
}

/** Not a query — nothing is cached, the browser is handed a file. */
export function useDownloadApplicantFile() {
  return useMutation({
    mutationFn: (filename: string) => usersService.download(filename),
    meta: { success: 'File downloaded' },
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: () => usersService.testEmail(),
    meta: { success: 'Test email sent' },
  })
}

/**
 * Fetches one of the files a family uploaded and saves it. Named per file so
 * the toast can say which one, and so two cells never share a pending state.
 */
export function useDownloadFile(filename: string) {
  return useMutation({
    mutationFn: () => usersService.download(filename),
    meta: { success: `${filename} downloaded` },
    onSuccess: (blob) => saveBlob(blob, filename),
  })
}
