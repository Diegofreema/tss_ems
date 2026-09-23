import { paginated, request, toFormData } from '../client'
import type { Id } from '../types'
import type {
  CreateTopicBody,
  EClass,
  EnterScoreBody,
  MessageAdminBody,
  MessageStudentsBody,
  MyResultParams,
  MyTeachingProfile,
  RegisteredStudentParams,
  ResultRow,
  Teacher,
  TeacherClassArm,
  TeacherResult,
  TeacherRoll,
  TeacherDashboard,
  TeacherStudent,
  TeacherSubject,
  Topic,
  UpdateMyTeachingProfileBody,
  UpdateTopicBody,
  UploadBatch,
  UploadBatchKey,
  UploadResultsBody,
} from './types'

/** Everything under `/teachers/me` — the caller is resolved from the token. */
export const teachingService = {
  /** The record and the arms taken, which arrive as siblings in one envelope. */
  profile: () => request<MyTeachingProfile>('teachers/me'),

  updateProfile: (body: UpdateMyTeachingProfileBody) =>
    request<{ teacher: Teacher }>('teachers/me', { method: 'POST', form: toFormData(body) }),

  dashboard: () => request<TeacherDashboard>('teachers/me/dashboard'),

  /** Whole: the endpoint takes no page, no limit and no search term. */
  subjects: () =>
    request<{ subjects: TeacherSubject[] }>('teachers/me/subjects').then(
      (data) => data.subjects,
    ),

  /**
   * The roll. Empty when no arm is assigned — it never falls back to the whole
   * school — and the arms it was drawn from come back beside it, so they are
   * folded onto the page rather than dropped.
   *
   * `page` and `limit` are honoured; a `q` is not, so the search box over this
   * list is worked out on the rows themselves.
   */
  students: (params: { page?: number; limit?: number } = {}) =>
    request<Record<string, unknown>>('teachers/me/students', { query: { ...params } }).then(
      (data): TeacherRoll => ({
        ...paginated<TeacherStudent>(data, 'students'),
        class_arms: (data.class_arms ?? []) as TeacherClassArm[],
      }),
    ),

  /** Keyed `classes`, like `registeredStudents` and unlike everything else here. */
  eclasses: () =>
    request<{ classes: EClass[] }>('teachers/me/eclasses').then((data) => data.classes),

  /** Keyed `registered`, not `students`, unlike every other list here. */
  registeredStudents: (params: RegisteredStudentParams) =>
    request<{ registered: TeacherStudent[] }>('teachers/me/registered-students', {
      query: { ...params },
    }).then((data) => data.registered),

  messageAdmin: (body: MessageAdminBody) =>
    request<unknown>('teachers/me/message-admin', { method: 'POST', body }),

  messageStudents: (body: MessageStudentsBody) =>
    request<unknown>('teachers/me/message-students', { method: 'POST', body }),

  uploadResults: (body: UploadResultsBody) =>
    request<unknown>('teachers/me/uploads', { method: 'POST', form: toFormData(body) }),

  /**
   * Uploads grouped by subject / class / term / session, with approval status.
   * Keyed `batches`, and empty on this deployment for every teaching login —
   * so what one of these rows actually holds has not been seen.
   */
  uploadBatches: () =>
    request<{ batches: UploadBatch[] }>('teachers/me/uploads').then((data) => data.batches),

  uploadBatch: ({ subjectId, departmentId, semesterId, sessionId }: UploadBatchKey) =>
    request<{ results: ResultRow[] }>(
      `teachers/me/uploads/${subjectId}/${departmentId}/${semesterId}/${sessionId}`,
    ).then((data) => data.results),

  /** Always confined to the caller's own subjects. */
  results: (params: MyResultParams = {}) =>
    request<Record<string, unknown>>('teachers/me/results', { query: { ...params } }).then(
      (data) => paginated<TeacherResult>(data, 'results'),
    ),

  /** Creates or updates one result. */
  enterScore: (body: EnterScoreBody) =>
    request<unknown>('teachers/me/scores', { method: 'POST', body }),

  topics: () => request<{ topics: Topic[] }>('teachers/me/topics').then((data) => data.topics),

  /** Refused with 403 if the subject is not the caller's. */
  addTopic: (body: CreateTopicBody) =>
    request<{ topic: Topic }>('teachers/me/topics', { method: 'POST', body }),

  updateTopic: (id: Id, body: UpdateTopicBody) =>
    request<{ topic: Topic }>(`teachers/me/topics/${id}`, { method: 'POST', body }),
}
