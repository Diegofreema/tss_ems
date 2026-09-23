import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id, PageParams } from '../types'
import { teachingKeys } from './keys'
import { teachingService } from './service'
import type {
  CreateTopicBody,
  EnterScoreBody,
  MessageAdminBody,
  MessageStudentsBody,
  MyResultParams,
  RegisteredStudentParams,
  UpdateMyTeachingProfileBody,
  UpdateTopicBody,
  UploadBatchKey,
  UploadResultsBody,
} from './types'

export function useMyTeachingProfile() {
  return useQuery({
    queryKey: teachingKeys.profile(),
    queryFn: () => teachingService.profile(),
  })
}

export function useUpdateMyTeachingProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMyTeachingProfileBody) => teachingService.updateProfile(body),
    meta: { success: 'Your details were saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teachingKeys.profile() }),
  })
}

export function useMyTeachingDashboard() {
  return useQuery({
    queryKey: teachingKeys.dashboard(),
    queryFn: () => teachingService.dashboard(),
  })
}

export function useMySubjects() {
  return useQuery({
    queryKey: teachingKeys.subjects(),
    queryFn: () => teachingService.subjects(),
  })
}

export function useMyStudents(params: PageParams = {}) {
  return useQuery({
    queryKey: teachingKeys.students(params),
    queryFn: () => teachingService.students(params),
  })
}

export function useMyEClasses() {
  return useQuery({
    queryKey: teachingKeys.eclasses(),
    queryFn: () => teachingService.eclasses(),
  })
}

/** Idle until a subject is chosen, which the endpoint requires. */
export function useRegisteredStudents(params: Partial<RegisteredStudentParams>) {
  return useQuery({
    queryKey: teachingKeys.registeredStudents(params),
    queryFn: () => teachingService.registeredStudents(params as RegisteredStudentParams),
    enabled: params.subject_id !== undefined,
  })
}

export function useMessageAdmin() {
  return useMutation({
    mutationFn: (body: MessageAdminBody) => teachingService.messageAdmin(body),
    meta: { success: 'Message sent to the office' },
  })
}

export function useMessageMyStudents() {
  return useMutation({
    mutationFn: (body: MessageStudentsBody) => teachingService.messageStudents(body),
    meta: { success: 'Message sent to your pupils' },
  })
}

export function useUploadResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UploadResultsBody) => teachingService.uploadResults(body),
    meta: { success: 'Results uploaded' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingKeys.uploads() })
      queryClient.invalidateQueries({ queryKey: teachingKeys.all })
    },
  })
}

export function useMyUploadBatches() {
  return useQuery({
    queryKey: teachingKeys.uploads(),
    queryFn: () => teachingService.uploadBatches(),
  })
}

export function useUploadBatch(key: Partial<UploadBatchKey>) {
  const ready = Object.values(key).every((value) => value !== undefined)
  return useQuery({
    queryKey: teachingKeys.uploadBatch(key as UploadBatchKey),
    queryFn: () => teachingService.uploadBatch(key as UploadBatchKey),
    enabled: ready,
  })
}

export function useMyResults(params: MyResultParams = {}) {
  return useQuery({
    queryKey: teachingKeys.results(params),
    queryFn: () => teachingService.results(params),
  })
}

/**
 * A whole sheet, one mark at a time — the endpoint takes a single pupil, and a
 * school's network is not the place for thirty concurrent writes. It stops at
 * the first refusal: the marks already taken stay, and the sheet is re-read
 * either way, so what stuck is what shows.
 */
export function useEnterScores() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rows: EnterScoreBody[]) => {
      for (const row of rows) await teachingService.enterScore(row)
      return rows.length
    },
    meta: { success: 'Scores saved' },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teachingKeys.all }),
  })
}

/** One score in, every results view stale. */
export function useEnterScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EnterScoreBody) => teachingService.enterScore(body),
    meta: { success: 'Score saved' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teachingKeys.all }),
  })
}

export function useMyTopics() {
  return useQuery({
    queryKey: teachingKeys.topics(),
    queryFn: () => teachingService.topics(),
  })
}

export function useAddTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTopicBody) => teachingService.addTopic(body),
    meta: { success: 'Topic added' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teachingKeys.topics() }),
  })
}

export function useUpdateTopic(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateTopicBody) => teachingService.updateTopic(id, body),
    meta: { success: 'Topic updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teachingKeys.topics() }),
  })
}
