import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dropCurriculumReads } from '../curriculum'
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
    // The root: `options()` is a sibling of `lists()` and cached for ever, so
    // the new subject would not be offered by a form until the tab reloaded.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
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
    // Written from the subject's end here and from the teacher's end in
    // `useAssignSubjects`; both are the same fact. See `dropCurriculumReads`.
    onSuccess: () => dropCurriculumReads(queryClient),
  })
}

export function useSetSubjectClasses(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SetSubjectClassesBody) => subjectsService.setClasses(id, body),
    meta: { success: 'Classes set for the subject' },
    onSuccess: () => dropCurriculumReads(queryClient),
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
