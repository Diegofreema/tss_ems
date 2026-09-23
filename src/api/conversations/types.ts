import type { Id } from '../types.ts'

/**
 * In-app messages, under `/conversations`.
 *
 * A thread both sides can write to — a guardian and the teacher who actually
 * takes their child, or the office. This is **not** the notice board
 * (`src/api/notifications`, one-way, the school talking to everybody) and not
 * the outbound SMS/e-mail log (`src/api/teaching`, which leaves the system
 * and never comes back). A student is deliberately given nobody to write to:
 * their messages to the school go through their guardian.
 *
 * **Read off a live answer on 2026-09-08** for the contacts list, the inbox
 * and `POST /{id}/read`. The single thread, the badge endpoint and the three
 * remaining writes have never been fired on this deployment, and say so at
 * each shape below rather than being guessed at.
 */

/** A closed thread takes no more replies; only the office may close one. */
export type ConversationStatus = 'open' | 'closed'

/**
 * Somebody this account is allowed to start a conversation with.
 *
 * The list is worked out server-side from the relationships that already
 * exist — a parent gets the staff who teach their own children plus the
 * office, a teacher gets the parents of the students they teach, an admin gets
 * everybody, a student gets an empty list. Writing to anybody not on it is a
 * 403 carrying a sentence saying what to do instead.
 */
export type Contact = {
  user_id: number
  name: string
  /** The login's role: 1 Administrator, 3 Teacher, 4 Parent, as seen live. */
  role_id: number
  /** That role expanded — "Administrator", "Teacher", "Parent". */
  role: string
  /**
   * How this contact earned their place on the list — the relationship, in a
   * sentence, for a UI that wants to say *why* it is offering somebody.
   *
   * **Null on every row of the only live reading**, admin1's, where the
   * answer is "everybody" and there is no relationship to name. Nothing may
   * assume a string here; a screen shows it where it is there and shows the
   * `role` alone where it is not.
   */
  why: string | null
}

/** One of the other people on a thread, as the inbox names them. */
export type ConversationParticipant = {
  user_id: number
  name: string
  role: string
}

/** A row of the inbox: the thread, who else is on it, and where it got to. */
export type ConversationSummary = {
  id: number
  subject: string | null
  status: ConversationStatus
  /** Which child the thread is about, where it was started against one. */
  student_id: number | null
  /** That child, expanded. Null on the live row, where `student_id` was too. */
  about: string | null
  /** Everybody on the thread except the caller. */
  with: ConversationParticipant[]
  last_message: string | null
  /**
   * **Already formatted for a reader, not ISO** — `"9/8/26, 11:12 AM"` on the
   * live answer, where every other stamp this API sends carries the school's
   * `+01:00`. It is a month/day/year string with no zone, so it must not be
   * handed to `Date` or to the app's own date helpers: it is displayed as it
   * arrived, or the ordering is taken from the list's own order instead.
   */
  last_message_at: string | null
  /** Unread on this thread, for this account. Counted by message id. */
  unread: number
}

/**
 * `GET /conversations` — the caller's own threads, most recently active
 * first, with the whole-inbox unread total beside them.
 */
export type InboxEnvelope = {
  conversations: ConversationSummary[]
  /** Across every thread, so a list screen needs no second call for its badge. */
  unread: number
  message: string | null
}

export type InboxParams = {
  status?: ConversationStatus
  /** Searches the subject, not the messages. */
  q?: string
}

/**
 * One message on a thread. Read live on 2026-09-11.
 *
 * `mine` is the server's own answer to "did this account write it", which is
 * better than the one this app worked out for itself: the school knows which
 * login is calling, and a reader whose `user_id` is missing from the session
 * would otherwise have every message drawn as somebody else's.
 */
export type ConversationMessage = {
  id: number
  user_id: number
  /** The sender's name, already assembled. */
  from: string
  mine: boolean
  body: string
  /** Formatted for a reader, not ISO — see `last_message_at`. */
  sent_at: string
}

/**
 * `GET /conversations/{id}` — the thread, who is on it, and what was said.
 *
 * **The messages are one field of an answer that wraps them**, which is what
 * this type exists to record: the payload is `{ conversation: { …, messages:
 * [...] } }`, and reading `messages` off the top level — which this app did
 * until 2026-09-11 — finds nothing and draws every thread in every portal as
 * one it could not display.
 *
 * The one thing the endpoint's own description promises is that **opening a
 * thread marks it read** — so this is a read that writes, and like
 * `GET /notifications/{id}` it must never sit in a route loader, a prefetch,
 * or anything react-query might retry.
 *
 * Anybody who is neither a participant nor an administrator gets a 404 rather
 * than a 403: they have no business learning the thread exists.
 */
export type ConversationThread = {
  conversation?: ConversationSummary & { messages?: ConversationMessage[] }
}

/** What `POST /conversations` takes. Subject and body are both required. */
export type StartConversationBody = {
  /** A `user_id` from the contacts list. Anything else is a 403. */
  to: Id
  subject: string
  body: string
  /** Optional; records which child the thread is about. */
  student_id?: Id | null
}

/** What `POST /conversations/{id}/reply` takes. Everybody on a thread may. */
export type ReplyBody = {
  body: string
}

/**
 * What `POST /conversations/{id}/read` answers with — the caller's unread
 * total once this thread has been cleared, so the badge moves without a
 * second call. Seen live.
 */
export type ReadResult = {
  unread: number
}
