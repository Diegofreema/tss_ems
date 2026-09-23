import { paginated, request } from '../client'
import type { Id } from '../types'
import type {
  BatchKey,
  ClassSheet,
  ClassSheetParams,
  CorrectMarkBody,
  DecideBody,
  EnterMarkBody,
  Mark,
  MarkListParams,
  MyMarkParams,
  MyMarks,
  PendingBatch,
  RejectBatchBody,
} from './types'

export const resultsService = {
  /** The whole register, narrowed by any of the filters. Staff. */
  list: (params: MarkListParams = {}) =>
    request<Record<string, unknown>>('results', { query: { ...params } }).then((data) =>
      paginated<Mark>(data, 'results'),
    ),

  /** One mark. Staff only. */
  get: (id: Id) =>
    request<{ result?: Mark } & Record<string, unknown>>(`results/${id}`).then(
      (data) => data.result ?? (data as unknown as Mark),
    ),

  /**
   * Every pupil in the class against every subject, with the position worked
   * out. `department_id` is required.
   */
  classSheet: (params: ClassSheetParams) =>
    request<ClassSheet>('results/class-sheet', { query: { ...params } }),

  /** The mark starts `pending`; the total and the grade come back worked out. */
  enter: (body: EnterMarkBody) => request<Mark>('results', { method: 'POST', body }),

  /** Partial. Whatever is left out keeps the value the mark already had. */
  correct: (id: Id, body: CorrectMarkBody) =>
    request<Mark>(`results/${id}`, { method: 'POST', body }),

  /** 409 once released — withdraw it with `decide` first. */
  remove: (id: Id) => request<unknown>(`results/${id}`, { method: 'DELETE' }),

  /** Batches waiting on the office. Administrators only. */
  pending: () =>
    request<Record<string, unknown>>('results/pending').then(
      (data) => data as { batches?: PendingBatch[] } & Record<string, unknown>,
    ),

  /**
   * Releases a whole batch. Releasing twice changes nothing; re-releasing
   * after a correction picks up the corrected marks, which are pending again
   * by then.
   */
  approve: (body: BatchKey) => request<unknown>('results/approve', { method: 'POST', body }),

  /** Sends the batch back with a reason, stored against every mark in it. */
  reject: (body: RejectBatchBody) =>
    request<unknown>('results/reject', { method: 'POST', body }),

  /** One mark, either way — and `pending` is how a released one is withdrawn. */
  decide: (id: Id, body: DecideBody) =>
    request<unknown>(`results/${id}/decide`, { method: 'POST', body }),

  /** The signed-in pupil's own released marks, with the term average. */
  mine: (params: MyMarkParams = {}) =>
    request<MyMarks>('results/mine', { query: { ...params } }),

  /** Each of the signed-in guardian's children, with their released marks. */
  children: () => request<Record<string, unknown>>('results/children'),

  /**
   * One pupil's marks. Whose pupil it is decides the answer rather than the id
   * in the URL — a teacher may read a class they are attached to, a guardian
   * only their own children, a pupil only themselves; 403 otherwise.
   */
  forStudent: (studentId: Id, params: MyMarkParams = {}) =>
    request<MyMarks>(`results/student/${studentId}`, { query: { ...params } }),
}
