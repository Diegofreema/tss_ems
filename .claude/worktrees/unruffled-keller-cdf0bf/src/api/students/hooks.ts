import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { studentKeys } from './keys'
import { studentsService } from './service'
import type {
  PromoteStudentsBody,
  SetStudentStatusBody,
  StudentBody,
  StudentListParams,
  StudentResultParams,
} from './types'

export function useStudents(params: StudentListParams = {}) {
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => studentsService.list(params),
  })
}

export function useApplicants(sessionId?: number) {
  return useQuery({
    queryKey: studentKeys.applicants(sessionId),
    queryFn: () => studentsService.applicants(sessionId),
  })
}

export function useStudent(id: Id | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: () => studentsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StudentBody) => studentsService.create(body),
    meta: { success: 'Pupil admitted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useUpdateStudent(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StudentBody) => studentsService.update(id, body),
    meta: { success: 'Pupil updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

export function useSetStudentStatus(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetStudentStatusBody) => studentsService.setStatus(id, body),
    meta: { success: 'Pupil status changed' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

/** A promotion moves whole cohorts, so nothing about students survives it. */
export function usePromoteStudents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PromoteStudentsBody) => studentsService.promote(body),
    meta: { success: 'Pupils promoted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useStudentInvoices(id: Id | undefined) {
  return useQuery({
    queryKey: studentKeys.invoices(id ?? ''),
    queryFn: () => studentsService.invoices(id!),
    enabled: id !== undefined,
  })
}

export function useStudentResults(id: Id | undefined, params: StudentResultParams = {}) {
  return useQuery({
    queryKey: studentKeys.results(id ?? '', params),
    queryFn: () => studentsService.results(id!, params),
    enabled: id !== undefined,
  })
}
