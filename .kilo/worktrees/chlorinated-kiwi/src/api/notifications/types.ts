import type { Pagination } from '../types.ts'

/**
 * The school's notice board, under `/notifications`.
 *
 * **Read off live answers on 2026-09-01**, once the migration that had been
 * 500ing every read landed. What the contract promised and what the board
 * actually sends differ in four names, so nothing here is guessed any more:
 * the message is `message`, the stamp is `datecreated`, the view tally is
 * `viewcount`, and there is no `expiresat` or `department_id` on a notice at
 * all — the server keeps expiry to itself and sends `status` and an expanded
 * `class_name` instead.
 *
 * Every read shape is now off a live answer, the office's list and the single
 * notice included. Only the three write bodies are unfired.
 */

/** Who a notice is addressed to. Anything else is refused with 422. */
export type NoticeAudience =
  | 'all'
  | 'students'
  /** One class and that class's guardians — what an automatic notice uses. */
  | 'students_parents'
  | 'teachers'
  | 'parents'

export const NOTICE_AUDIENCES: NoticeAudience[] = [
  'all',
  'students',
  'students_parents',
  'teachers',
  'parents',
]

/** Whole school, or the one class named on `class_name`. */
export type NoticeScope = 'school' | 'class'

export type Notice = {
  id: number
  title: string | null
  /** The notice itself. Plain text on everything the board holds today. */
  message: string | null
  /** ISO, carrying the school's own `+01:00`. */
  datecreated: string | null
  /** The account that posted it, and that account's name beside it. */
  user_id: number | null
  posted_by: string | null
  recipients: NoticeAudience | null
  /**
   * `active` on everything `/notifications/mine` sends. The board drops
   * expired notices itself, so this is the only thing standing where the
   * contract described an `expiresat` the record does not carry.
   */
  status: string | null
  /** Counted up each time the notice is opened through `/notifications/{id}`. */
  viewcount: number | null
  /** Per-caller, so it is on `/notifications/mine` and not on the office list. */
  is_read: boolean
  /** True where a teacher setting an assignment raised it, rather than the office. */
  is_automatic: boolean
  scope: NoticeScope | null
  /** The class a `class` notice is limited to, expanded. Null school-wide. */
  class_name: string | null
  /**
   * Where the notice points, if anywhere. The writer takes one; **no read has
   * ever sent it back** — not the list, not the office's list, not the single
   * notice — so it is optional and nothing may depend on it surviving a save.
   */
  link?: string | null
}

/**
 * `GET /notifications/{id}` — one notice, and the badge number that is left
 * once it has been counted.
 *
 * **This read writes.** It flips `is_read` and it counts a view, and the view
 * is a hit rather than a reader: fetching notice 1 twice from one account took
 * `viewcount` from 2 to 3 to 4. So it must never sit in a route loader, a
 * prefetch, or anything react-query might retry — opening it is a deliberate
 * act by somebody who is looking at the notice.
 */
/**
 * What `POST /notifications/{id}/read` answers with — the notice marked read
 * without fetching it, so no view is counted, and the badge number that is
 * left, so it moves without a second call.
 */
export type NoticeReadResult = {
  id: number
  is_read: boolean
  unread_count: number
}

/**
 * What `/notifications/mine` answers with.
 *
 * `unread_count` is the same number `/notifications/unread-count` serves on
 * its own, so a screen showing the list never needs the second call.
 * `audience` is the bucket the caller was served under — "teachers" for a
 * teaching login, "students" for a student — and is the server saying which
 * `recipients` values it matched them against.
 */
export type MyNoticesEnvelope = {
  notifications: Notice[]
  unread_count: number
  audience: string | null
  pagination: Pagination
}

export type MyNoticeParams = {
  /** Defaults to 25 at the server. */
  limit?: number
  /**
   * `1` to leave out everything already read. Sent, and **not confirmed to do
   * anything**: the board held no read notice to tell the two answers apart.
   */
  unread?: 1
}

export type NoticeListParams = {
  /** Defaults to 50 at the server. */
  limit?: number
  page?: number
}

/**
 * `GET /notifications` — the office's list, and the audiences it will accept.
 *
 * `audiences` is the server's own catalogue of `recipients` values, so a form
 * offering them reads them from here rather than hard-coding a list that could
 * drift. It names no audience for the office itself, which is consistent with
 * an admin's own `/notifications/mine` coming back empty.
 *
 * **It is not the whole board.** admin1 reads one notice here while a student
 * and a teacher both read two — notice 31 is on nobody's office list and on
 * everybody else's. Whatever scopes this is server-side and unexplained, so
 * the page built on it says it is the office's list rather than "every notice
 * the school holds".
 */
export type AllNoticesEnvelope = {
  notifications: Notice[]
  audiences: string[]
  pagination: Pagination
}

/**
 * What `POST /notifications` takes.
 *
 * **Unfired** — the three write endpoints are the office's and none has been
 * exercised. Three of these fields never come back on a read at all:
 * `department_id`, `link` and `expiresat`. They are what the writer takes, so
 * a form may send them; nothing may then read them back to confirm they
 * landed, which is worth knowing before anyone builds on one.
 */
export type NoticeBody = {
  title?: string
  message?: string
  recipients: NoticeAudience
  /** `active` on everything the board holds. */
  status?: string
  /** Omit, or send null, for the whole school. */
  department_id?: number | null
  /** Where the notice points. Empty string for none. */
  link?: string
  /** Empty string never expires. */
  expiresat?: string
}

/**
 * `PUT /notifications/{id}` is a partial update: whatever is left out is left
 * alone, so a form must send only the fields it actually showed.
 */
export type NoticeEditBody = Partial<NoticeBody>
