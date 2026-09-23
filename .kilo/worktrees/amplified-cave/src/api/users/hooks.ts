import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { saveBlob } from '@/lib/download'
import { adminKeys } from '../admins/keys'
import type { Id } from '../types'
import { userKeys } from './keys'
import { usersService } from './service'
import type {
  CreateUserBody,
  SetUserStatusBody,
  UpdateAdminBody,
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
    // The root rather than the register and the record: `dashboard()` is the
    // active-and-inactive tally this write moves, and it is a sibling of both.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useFreeEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => usersService.freeEmail(email),
    meta: { success: 'Email address freed' },
    // The freed account's own row and the tally sit outside `lists()`.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useMyProfile() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => usersService.profile(),
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
      // `admin(id)` is a descendant of `admins()`, so the one call covers both.
      queryClient.invalidateQueries({ queryKey: userKeys.admins() })
      // The same office record is fetched from `users/admins/{id}` by the
      // admins domain as well, and cached under a key of its own. One row, two
      // addresses: dropping only this one leaves the other reading the old name.
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    },
  })
}

export function useCreateAdmin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUserBody) => usersService.createAdmin(body),
    meta: { success: 'Administrator created' },
    onSuccess: () => {
      // The whole root: a new administrator is a new login, so the account
      // register and the tally above it both move, and neither is under
      // `admins()`. The admins domain keeps its own copy of the register.
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
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
