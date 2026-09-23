import { request } from '../client'
import type { Id } from '../types'
import type {
  AllNoticesEnvelope,
  MyNoticeParams,
  MyNoticesEnvelope,
  NoticeBody,
  NoticeEditBody,
  NoticeListParams,
  NoticeReadResult,
} from './types'

/**
 * The school notice board. Three endpoints any signed-in caller may use, and
 * four the office alone may.
 *
 * Every read here is typed off a live answer taken on 2026-09-01, so there is
 * no shape-guessing left: each one is unwrapped by the key it actually uses.
 * The three writes are the office's and none has been fired.
 */

export const noticesService = {
  /**
   * Notices addressed to the caller, newest first, each carrying `is_read`.
   *
   * The envelope also holds `unread_count` and the audience the caller was
   * matched under; neither is handed on. The badge reads `unread-count`, the
   * endpoint made to be polled, rather than a copy that ages with this page.
   */
  mine: (params: MyNoticeParams = {}) =>
    request<MyNoticesEnvelope>('notifications/mine', { query: { ...params } }).then((page) => {
      // A missing field is a shape change, not an empty board — this list is
      // the complete state of a set on the device.
      if (!Array.isArray(page.notifications)) {
        throw new Error('The server sent the notices in a shape this app cannot read.')
      }
      return page.notifications
    }),

  /** Just the badge number. Cheap enough to poll, which is what it is for. */
  unreadCount: () =>
    request<{ unread_count?: number }>('notifications/unread-count').then(
      (answer) => answer.unread_count ?? 0,
    ),

  /**
   * Marks one notice read without opening it, so it costs no view — the list
   * already shows the notice, and a reader ticking it off has not asked to be
   * counted as a fresh reader. The badge number that is left comes back with it.
   */
  readOne: (id: Id) =>
    request<NoticeReadResult>(`notifications/${id}/read`, { method: 'POST' }),

  /**
   * Clears the caller's whole board in one call, without opening anything —
   * so unlike `open` it costs no view on any notice.
   */
  readAll: () => request<unknown>('notifications/read-all', { method: 'POST' }),

  /**
   * The office's list, with the audiences the writer will accept. Not the
   * whole board — see `AllNoticesEnvelope`. Admin only.
   */
  all: (params: NoticeListParams = {}) =>
    request<AllNoticesEnvelope>('notifications', { query: { ...params } }),

  post: (body: NoticeBody) => request<unknown>('notifications', { method: 'POST', body }),

  /** Partial: whatever is left out of `body` is left as it stands. */
  edit: (id: Id, body: NoticeEditBody) =>
    request<unknown>(`notifications/${id}`, { method: 'PUT', body }),

  /** Takes the read-marks with it. There is no undo. */
  remove: (id: Id) => request<unknown>(`notifications/${id}`, { method: 'DELETE' }),
}
