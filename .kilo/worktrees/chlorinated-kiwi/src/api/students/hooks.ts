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
    meta: { success: 'Student admitted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useUpdateStudent(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StudentBody) => studentsService.update(id, body),
    meta: { success: 'Student updated' },
    // The whole root rather than the record and the register: `applicants`
    // hangs off `all` rather than off `lists()`, and an edit that moves a
    // student between the two tables would otherwise leave them on both.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

export function useSetStudentStatus(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetStudentStatusBody) => studentsService.setStatus(id, body),
    meta: { success: 'Student status changed' },
    // Status is exactly what moves a row between the applicant and student
    // tables, and the applicant one is not under `lists()`. See above.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: studentKeys.all }),
  })
}

/** A promotion moves whole cohorts, so nothing about students survives it. */
export function usePromoteStudents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PromoteStudentsBody) => studentsService.promote(body),
    meta: { success: 'Students promoted' },
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
