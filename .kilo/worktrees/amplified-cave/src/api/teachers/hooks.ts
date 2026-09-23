import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dropCurriculumReads } from '../curriculum'
import type { Id } from '../types'
import { teacherKeys } from './keys'
import { teachersService } from './service'
import type {
  AssignSubjectsBody,
  CreateStaffBody,
  MailStaffBody,
  StaffListParams,
  UpdateStaffBody,
} from './types'

export function useStaff(params: StaffListParams = {}) {
  return useQuery({
    queryKey: teacherKeys.list(params),
    queryFn: () => teachersService.list(params),
  })
}

export function useStaffMember(id: Id | undefined) {
  return useQuery({
    queryKey: teacherKeys.detail(id ?? ''),
    queryFn: () => teachersService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateStaffBody) => teachersService.create(body),
    meta: { success: 'Staff member added' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.lists() }),
  })
}

export function useUpdateStaff(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateStaffBody) => teachersService.update(id, body),
    meta: { success: 'Staff member updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() })
    },
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => teachersService.remove(id),
    meta: { success: 'Staff member deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teacherKeys.all }),
  })
}

export function useAssignSubjects(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignSubjectsBody) => teachersService.assignSubjects(id, body),
    meta: { success: 'Subjects assigned' },
    // The subject's own record and the teacher's "my subjects" hold this too.
    onSuccess: () => dropCurriculumReads(queryClient),
  })
}

/** A download rather than a cache entry. */
export function useDownloadCv() {
  return useMutation({
    mutationFn: (id: Id) => teachersService.cv(id),
    meta: { success: 'CV downloaded' },
  })
}

export function useMailStaff() {
  return useMutation({
    mutationFn: (body: MailStaffBody) => teachersService.mail(body),
    meta: { success: 'Email sent' },
  })
}
