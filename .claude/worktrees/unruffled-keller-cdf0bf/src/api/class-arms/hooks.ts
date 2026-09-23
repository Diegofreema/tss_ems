import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studentKeys } from '../students/keys'
import type { Id } from '../types'
import { classArmKeys } from './keys'
import { classArmsService } from './service'
import type { AssignStudentsBody, ClassArmBody, ClassArmListParams } from './types'

export function useClassArms(params: ClassArmListParams = {}) {
  return useQuery({
    queryKey: classArmKeys.list(params),
    queryFn: () => classArmsService.list(params),
  })
}

export function useClassArmOptions() {
  return useQuery({
    queryKey: classArmKeys.options(),
    queryFn: () => classArmsService.options(),
    staleTime: Infinity,
  })
}

export function useClassArmsForDepartment(departmentId: Id | undefined) {
  return useQuery({
    queryKey: classArmKeys.forDepartment(departmentId ?? ''),
    queryFn: () => classArmsService.forDepartment(departmentId!),
    enabled: departmentId !== undefined,
  })
}

export function useClassArm(id: Id | undefined) {
  return useQuery({
    queryKey: classArmKeys.detail(id ?? ''),
    queryFn: () => classArmsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateClassArm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ClassArmBody) => classArmsService.create(body),
    meta: { success: 'Arm created' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classArmKeys.all }),
  })
}

export function useUpdateClassArm(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ClassArmBody) => classArmsService.update(id, body),
    meta: { success: 'Arm updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classArmKeys.all }),
  })
}

export function useClassArmStudents(id: Id | undefined, all = false) {
  return useQuery({
    queryKey: classArmKeys.students(id ?? '', all),
    queryFn: () => classArmsService.students(id!, all),
    enabled: id !== undefined,
  })
}

/** Placing a pupil in an arm changes how they read on the student screens too. */
export function useAssignStudentsToArm(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignStudentsBody) => classArmsService.assignStudents(id, body),
    meta: { success: 'Pupils moved into the arm' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classArmKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

export function useRemoveStudentFromArm(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (classArmStudentId: Id) => classArmsService.removeStudent(id, classArmStudentId),
    meta: { success: 'Pupil removed from the arm' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classArmKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    },
  })
}

export function useDeleteClassArm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: Id; force?: boolean }) => classArmsService.remove(id, force),
    meta: { success: 'Arm deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classArmKeys.all }),
  })
}
