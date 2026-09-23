import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { subjectKeys } from './keys'
import { subjectsService } from './service'
import type {
  AssignTeachersBody,
  SetSubjectClassesBody,
  SubjectBody,
  SubjectListParams,
} from './types'

export function useSubjects(params: SubjectListParams = {}) {
  return useQuery({
    queryKey: subjectKeys.list(params),
    queryFn: () => subjectsService.list(params),
  })
}

export function useSubjectOptions() {
  return useQuery({
    queryKey: subjectKeys.options(),
    queryFn: () => subjectsService.options(),
    staleTime: Infinity,
  })
}

export function useSubject(id: Id | undefined) {
  return useQuery({
    queryKey: subjectKeys.detail(id ?? ''),
    queryFn: () => subjectsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubjectBody) => subjectsService.create(body),
    meta: { success: 'Subject created' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.lists() }),
  })
}

export function useUpdateSubject(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubjectBody) => subjectsService.update(id, body),
    meta: { success: 'Subject updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  })
}

export function useDeactivateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => subjectsService.deactivate(id),
    meta: { success: 'Subject deactivated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  })
}

export function useActivateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => subjectsService.activate(id),
    meta: { success: 'Subject activated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  })
}

export function useAssignTeachersToSubject(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignTeachersBody) => subjectsService.assignTeachers(id, body),
    meta: { success: 'Teachers assigned to the subject' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.detail(id) }),
  })
}

export function useSetSubjectClasses(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetSubjectClassesBody) => subjectsService.setClasses(id, body),
    meta: { success: 'Classes set for the subject' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.detail(id) }),
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, force }: { id: Id; force?: boolean }) => subjectsService.remove(id, force),
    meta: { success: 'Subject deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  })
}
