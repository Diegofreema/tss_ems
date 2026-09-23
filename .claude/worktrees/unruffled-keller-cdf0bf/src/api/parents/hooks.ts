import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, PageParams } from '../types'
import { myFamilyKeys, parentKeys } from './keys'
import { myFamilyService, parentsService } from './service'
import type {
  ChildAttendanceParams,
  ChildResultParams,
  ParentBody,
  ParentListParams,
  SubmitAnswersBody,
} from './types'

/* ── The admin's guardian register ─────────────────────────────────────── */

export function useParents(params: ParentListParams = {}) {
  return useQuery({
    queryKey: parentKeys.list(params),
    queryFn: () => parentsService.list(params),
  })
}

export function useParent(id: Id | undefined) {
  return useQuery({
    queryKey: parentKeys.detail(id ?? ''),
    queryFn: () => parentsService.get(id!),
    enabled: id !== undefined,
  })
}

export function useParentChildren(id: Id | undefined) {
  return useQuery({
    queryKey: parentKeys.children(id ?? ''),
    queryFn: () => parentsService.children(id!),
    enabled: id !== undefined,
  })
}

export function useCreateParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ParentBody) => parentsService.create(body),
    meta: { success: 'Parent added' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export function useUpdateParent(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ParentBody) => parentsService.update(id, body),
    meta: { success: 'Parent updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export function useDeactivateParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => parentsService.deactivate(id),
    meta: { success: 'Parent deactivated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export function useActivateParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => parentsService.activate(id),
    meta: { success: 'Parent activated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export function useDeleteParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => parentsService.remove(id),
    meta: { success: 'Parent deleted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: parentKeys.all }),
  })
}

export function useParentDirectory() {
  return useQuery({
    queryKey: parentKeys.directory(),
    queryFn: () => parentsService.directory(),
  })
}

export function useParentDirectoryEntry(id: Id | undefined) {
  return useQuery({
    queryKey: parentKeys.directoryEntry(id ?? ''),
    queryFn: () => parentsService.directoryEntry(id!),
    enabled: id !== undefined,
  })
}

/* ── The guardian's own portal ─────────────────────────────────────────── */

export function useMyParentRecord() {
  return useQuery({
    queryKey: myFamilyKeys.profile(),
    queryFn: () => myFamilyService.profile(),
  })
}

export function useMyFamilyDashboard() {
  return useQuery({
    queryKey: myFamilyKeys.dashboard(),
    queryFn: () => myFamilyService.dashboard(),
  })
}

export function useMyChildren() {
  return useQuery({
    queryKey: myFamilyKeys.children(),
    queryFn: () => myFamilyService.children(),
  })
}

export function useMyChildrenInvoices(params: PageParams = {}) {
  return useQuery({
    queryKey: myFamilyKeys.invoices(params),
    queryFn: () => myFamilyService.invoices(params),
  })
}

export function useChildResults(childId: Id | undefined, params: ChildResultParams = {}) {
  return useQuery({
    queryKey: myFamilyKeys.childResults(childId ?? '', params),
    queryFn: () => myFamilyService.childResults(childId!, params),
    enabled: childId !== undefined,
  })
}

export function useChildAttendance(childId: Id | undefined, params: ChildAttendanceParams = {}) {
  return useQuery({
    queryKey: myFamilyKeys.childAttendance(childId ?? '', params),
    queryFn: () => myFamilyService.childAttendance(childId!, params),
    enabled: childId !== undefined,
  })
}

export function useMyChildrenAssignments() {
  return useQuery({
    queryKey: myFamilyKeys.assignments(),
    queryFn: () => myFamilyService.assignments(),
  })
}

export function useChildAssignment(childId: Id | undefined, setassignmentId: Id | undefined) {
  return useQuery({
    queryKey: myFamilyKeys.assignment(childId ?? '', setassignmentId ?? ''),
    queryFn: () => myFamilyService.assignment(childId!, setassignmentId!),
    enabled: childId !== undefined && setassignmentId !== undefined,
  })
}

/** Submitting closes it, so the child's list of assignments goes stale. */
export function useSubmitChildAssignment(childId: Id, setassignmentId: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmitAnswersBody) =>
      myFamilyService.submitAssignment(childId, setassignmentId, body),
    meta: { success: 'Assignment submitted' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myFamilyKeys.assignments() }),
  })
}

export function useChildAssignmentResult(assignmentId: Id | undefined) {
  return useQuery({
    queryKey: myFamilyKeys.assignmentResult(assignmentId ?? ''),
    queryFn: () => myFamilyService.assignmentResult(assignmentId!),
    enabled: assignmentId !== undefined,
  })
}
