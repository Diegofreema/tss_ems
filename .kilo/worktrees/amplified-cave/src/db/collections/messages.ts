import { conversationsService } from '@/api/conversations/service'
import type { Contact, InboxEnvelope } from '@/api/conversations/types'
import { schoolCollection, schoolDocument } from '../collection'
import { SET } from '../ids'

/**
 * In-app messages, on the device.
 *
 * Its own module rather than a member of any one portal's file, because both
 * endpoints are token-scoped and three of the four portals hang a messages
 * page off them: the office, the staff room and the guardian each get their
 * own answer under the same id, and the per-account wipe keeps one login's
 * inbox from ever reaching another. A student reaches neither — the school
 * gives a student no contacts, on purpose.
 *
 * The two things worth having with no signal are exactly these: **who you may
 * write to**, so a message can be composed at all, and **what has been said**,
 * so a guardian on a village connection can read the thread they were sent.
 * Neither is a page that lists something and is useful only online.
 *
 * One thread is deliberately **not** here. Opening `/conversations/{id}` marks
 * it read, so it is a read that writes, and a set that refetches on a schedule
 * would clear somebody's unread count without anybody having looked. It stays
 * on the query path until that side effect is split off the fetch.
 */

/**
 * Who this account may write to.
 *
 * Keyed on the login rather than the person: this school's register holds the
 * same teacher under several logins — five of one name on the answer this was
 * read from — and folding them together here would hide a real id the reader
 * may need to pick. The picker labels the ambiguity instead; see
 * `src/features/messages/contacts.ts`.
 */
export const msgContacts = schoolCollection<Contact, number>({
  id: SET.msgContacts,
  fetch: () => conversationsService.contacts(),
  getKey: (contact) => contact.user_id,
  schemaVersion: 1,
})

/**
 * The inbox, kept whole.
 *
 * A document rather than a register of threads, because the answer is the
 * threads *and* the whole-inbox unread total — and the badge in the header
 * reads that total. Storing the list alone would throw away the one figure
 * every portal shows, and force a second request to get it back.
 */
export const msgInbox = schoolDocument<InboxEnvelope>({
  id: SET.msgInbox,
  fetch: () => conversationsService.inbox(),
  schemaVersion: 1,
  /**
   * One of the few sets that genuinely is volatile: a message arriving while
   * the tab is open is the one worth showing without a reload. This is also
   * what retires `/conversations/unread-count` — the badge reads this
   * document's own total, so it costs no second request and it is still there
   * with no connection, which a polled endpoint never is.
   */
  refetchInterval: 60_000,
})

/** Preloaded together by the three portal shells that carry a messages page. */
export const messageCollections = [msgContacts, msgInbox]
