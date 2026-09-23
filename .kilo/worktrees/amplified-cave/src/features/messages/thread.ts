import type {
  ConversationStatus,
  ConversationThread,
} from '../../api/conversations/types.ts'

/**
 * Reading one thread.
 *
 * This module used to read five candidate keys for the messages and four for
 * a body, because `GET /conversations/{id}` had never been fired and the shape
 * was a guess. A live answer was read on 2026-09-11 and the guessing is gone,
 * along with the bug it was hiding: **the messages are nested**, under a
 * `conversation` the guesswork never looked inside, so every thread in every
 * portal drew as one this app could not display.
 *
 * What the endpoint actually sends:
 *
 * ```json
 * { "conversation": { "id": 36, "subject": "Test", "status": "open",
 *   "student_id": null, "about": null, "with": [ ... ],
 *   "last_message": "…", "last_message_at": "9/11/26, 9:48 AM", "unread": 0,
 *   "messages": [ { "id": 61, "user_id": 1, "from": "Chukwudi Aniegboka",
 *     "mine": true, "body": "…", "sent_at": "9/11/26, 9:48 AM" } ] } }
 * ```
 */

export type ThreadMessage = {
  /** Stable within the thread — the server's id where there is one. */
  key: string
  /** HTML where it was written in the editor, a plain sentence where it was not. */
  body: string
  senderId: number | undefined
  senderName: string
  /** However the server stamped it. Displayed as it arrived; never parsed. */
  at: string
  /** Written by whoever is reading, so it sits on the right of the thread. */
  mine: boolean
  /** Still in the outbox — said on this device, not yet with the school. */
  queued?: boolean
}

/** The thread itself, out of the envelope it arrives in. */
function conversationOf(doc: ConversationThread | undefined) {
  return doc?.conversation
}

/**
 * The messages, in the order the server sent them — which is the order a
 * conversation is read in.
 *
 * Sorting on a stamp would mean parsing one, and `sent_at` is a pre-formatted
 * `"9/11/26, 9:48 AM"` with no zone: parsing that is how a thread ends up in
 * the wrong order on a phone set to a different locale.
 */
export function threadMessages(
  doc: ConversationThread | undefined,
  meId: number | undefined,
): ThreadMessage[] {
  const rows = conversationOf(doc)?.messages
  if (!Array.isArray(rows)) return []

  return rows.map((row, index) => {
    const senderId = Number.isFinite(Number(row?.user_id)) && Number(row?.user_id) > 0
      ? Number(row.user_id)
      : undefined

    return {
      key: String(row?.id ?? `row-${index}`),
      body: typeof row?.body === 'string' ? row.body : '',
      senderId,
      senderName: typeof row?.from === 'string' ? row.from.trim() : '',
      at: typeof row?.sent_at === 'string' ? row.sent_at : '',
      /*
       * The school's own answer first. It knows which login is calling, where
       * this device only knows which id the session happened to store — and a
       * reader whose id is missing from the session would have every message
       * on the thread, including their own, drawn as somebody else's.
       */
      mine:
        typeof row?.mine === 'boolean'
          ? row.mine
          : senderId !== undefined && meId !== undefined && senderId === meId,
    }
  })
}

/**
 * Whether the answer looked like a thread at all.
 *
 * A thread with no messages is a real state — a conversation can be opened and
 * left — so an empty array is readable and a missing one is not. Telling the
 * two apart is what stops the screen saying "nothing has been said" over an
 * answer it simply could not read.
 */
export function isReadableThread(doc: ConversationThread | undefined): boolean {
  return Array.isArray(conversationOf(doc)?.messages)
}

/** The subject, falling back to what the inbox row already said. */
export function threadSubject(
  doc: ConversationThread | undefined,
  fallback: string,
): string {
  const subject = conversationOf(doc)?.subject
  return typeof subject === 'string' && subject.trim() ? subject.trim() : fallback
}

/** The status, falling back to what the inbox row already said. */
export function threadStatus(
  doc: ConversationThread | undefined,
  fallback: ConversationStatus,
): ConversationStatus {
  const status = conversationOf(doc)?.status
  return status === 'closed' || status === 'open' ? status : fallback
}
