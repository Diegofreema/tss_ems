import type { PageParams } from '../types'
import type { MyResultParams, RegisteredStudentParams, UploadBatchKey } from './types'

/** Everything here is scoped to the signed-in teacher, so no id in the key. */
export const teachingKeys = {
  all: ['teaching'] as const,
  profile: () => [...teachingKeys.all, 'profile'] as const,
  dashboard: () => [...teachingKeys.all, 'dashboard'] as const,
  subjects: () => [...teachingKeys.all, 'subjects'] as const,
  students: (params: PageParams) => [...teachingKeys.all, 'students', params] as const,
  eclasses: () => [...teachingKeys.all, 'eclasses'] as const,
  registeredStudents: (params: Partial<RegisteredStudentParams>) =>
    [...teachingKeys.all, 'registered-students', params] as const,
  uploads: () => [...teachingKeys.all, 'uploads'] as const,
  uploadBatch: (key: UploadBatchKey) => [...teachingKeys.uploads(), key] as const,
  results: (params: MyResultParams) => [...teachingKeys.all, 'results', params] as const,
  topics: () => [...teachingKeys.all, 'topics'] as const,
}
