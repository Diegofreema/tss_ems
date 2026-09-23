import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dropCurriculumReads } from '../curriculum'
import type { Id } from '../types'
import { departmentKeys } from './keys'
import { departmentsService } from './service'
import type {
  AddSubjectsBody,
  AllocateToClassBody,
  DepartmentBody,
  DepartmentListParams,
} from './types'

export function useDepartments(params: DepartmentListParams = {}) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => departmentsService.list(params),
  })
}

export function useDepartmentOptions() {
  return useQuery({
    queryKey: departmentKeys.options(),
    queryFn: () => departmentsService.options(),
    staleTime: Infinity,
  })
}

export function useDepartment(id: Id | undefined) {
  return useQuery({
    queryKey: departmentKeys.detail(id ?? ''),
    queryFn: () => departmentsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useDepartmentSubjects(id: Id | undefined) {
  return useQuery({
    queryKey: departmentKeys.subjects(id ?? ''),
    queryFn: () => departmentsService.subjects(id!),
    enabled: id !== undefined,
  })
}

export function useDepartmentClassArms(id: Id | undefined) {
  return useQuery({
    queryKey: departmentKeys.classArms(id ?? ''),
    queryFn: () => departmentsService.classArms(id!),
    enabled: id !== undefined,
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DepartmentBody) => departmentsService.create(body),
    meta: { success: 'Class created' },
    // The root, not the register: `options()` and `classes()` are siblings of
    // `lists()` and both are cached for ever, so a class created here was one
    // no form in the app would offer until the tab was reloaded.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  })
}

export function useUpdateDepartment(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DepartmentBody) => departmentsService.update(id, body),
    meta: { success: 'Class updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  })
}

export function useAddSubjectsToClass(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AddSubjectsBody) => departmentsService.addSubjects(id, body),
    meta: { success: 'Subjects added to the class' },
    // The subject's own record holds the same fact — see `dropCurriculumReads`.
    onSuccess: () => dropCurriculumReads(queryClient),
  })
}

export function useAllocateToClass(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AllocateToClassBody) => departmentsService.allocate(id, body),
    meta: { success: 'Allocated to the class' },
    onSuccess: () => dropCurriculumReads(queryClient),
  })
}

export function useRemoveSubjectFromClass(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subjectId: Id) => departmentsService.removeSubject(id, subjectId),
    meta: { success: 'Subject removed from the class' },
    onSuccess: () => dropCurriculumReads(queryClient),
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: Id; force?: boolean }) =>
      departmentsService.remove(id, force),
    meta: { success: 'Class deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: departmentKeys.all }),
  })
}

/** The level list the admin class dropdowns read. */
export function useClasses() {
  return useQuery({
    queryKey: departmentKeys.classes(),
    queryFn: () => departmentsService.classes(),
    staleTime: Infinity,
  })
}
