import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { resultKeys } from '../results/keys'
import { mySchoolingKeys } from '../my-schooling/keys'
import type { Id } from '../types'
import { teachingKeys } from './keys'
import { teachingService } from './service'
import type {
  CreateTopicBody,
  EnterScoreBody,
  RegisteredStudentParams,
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

export function useUploadResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UploadResultsBody) => teachingService.uploadResults(body),
    meta: { success: 'Results uploaded' },
    onSuccess: () => {
      // `uploads()` is under `all`, so the root covers it. The office reads
      // what was uploaded through the results controller, which is not.
      queryClient.invalidateQueries({ queryKey: teachingKeys.all })
      queryClient.invalidateQueries({ queryKey: resultKeys.all })
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

/**
 * A whole sheet, one mark at a time — the endpoint takes a single student, and a
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
    // Settled rather than success: a sheet that stopped half way through has
    // still moved the marks it got to, and must be re-read either way.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teachingKeys.all })
      // The same marks are the office's results register and its approval queue.
      queryClient.invalidateQueries({ queryKey: resultKeys.all })
    },
  })
}

/** One score in, every results view stale. */
export function useEnterScore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: EnterScoreBody) => teachingService.enterScore(body),
    meta: { success: 'Score saved' },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: teachingKeys.all })
      queryClient.invalidateQueries({ queryKey: resultKeys.all })
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingKeys.topics() })
      // A topic is a material in the students' portal.
      queryClient.invalidateQueries({ queryKey: mySchoolingKeys.all })
    },
  })
}

export function useUpdateTopic(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateTopicBody) => teachingService.updateTopic(id, body),
    meta: { success: 'Topic updated' },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachingKeys.topics() })
      queryClient.invalidateQueries({ queryKey: mySchoolingKeys.all })
    },
  })
}
