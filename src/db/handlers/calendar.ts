import { sessionsService, termsService } from '@/api/calendar/service'
import type { CalendarBody } from '@/api/calendar/types'
import { settingsService } from '@/api/settings/service'
import type { SettingsBody } from '@/api/settings/types'
import { queryClient } from '@/lib/query-client'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The school's own calendar — the years everything is filed under, and the three
 * terms inside one.
 *
 * A session or a term is a name and nothing else, which is why these are the
 * simplest writes in the app and a good place for the office to be able to work
 * without a connection: a school opens a new year at the start of a term, which
 * is exactly when everybody is somewhere other than a desk.
 *
 * Creating one is **not** idempotent — the school issues the id, so a replay
 * would open the year twice. Renaming and deleting are: both name a row that
 * already exists and say what it should be.
 */

registerHandler<CalendarBody>(WRITE.createSession, {
  send: (body) => sessionsService.create(body),
  idempotent: false,
  newId: idUnder('session'),
  collectionId: SET.refSessions,
})

registerHandler<{ id: Id; body: CalendarBody }>(WRITE.renameSession, {
  send: ({ id, body }) => sessionsService.rename(id, body),
  idempotent: true,
  collectionId: SET.refSessions,
})

/**
 * Never forced. Forcing leaves invoices, results and registrations pointing at
 * a year that is gone, and the API's refusal is the right answer — which the
 * drain treats as terminal and puts in front of a person.
 */
registerHandler<Id>(WRITE.removeSession, {
  send: (id) => sessionsService.remove(id),
  idempotent: true,
  collectionId: SET.refSessions,
})

registerHandler<CalendarBody>(WRITE.createTerm, {
  send: (body) => termsService.create(body),
  idempotent: false,
  newId: idUnder('semester'),
  collectionId: SET.refTerms,
})

registerHandler<{ id: Id; body: CalendarBody }>(WRITE.renameTerm, {
  send: ({ id, body }) => termsService.rename(id, body),
  idempotent: true,
  collectionId: SET.refTerms,
})

registerHandler<Id>(WRITE.removeTerm, {
  send: (id) => termsService.remove(id),
  idempotent: true,
  collectionId: SET.refTerms,
})

/**
 * Which year and which term the school is in.
 *
 * A school setting pointing at a row rather than a field on the row, which is
 * why it is its own write and why the guardrail matters: it cannot point at a
 * session the school has never issued an id for.
 *
 * Idempotent — it names the one that should be current, so a replay sets the
 * same one. The whole cache goes when it lands, because every unfiltered screen
 * in the app is about the current session.
 */
registerHandler<number>(WRITE.setCurrentSession, {
  send: async (id) => {
    const done = await settingsService.setCurrentSession(id)
    // The whole cache rather than the derived keys the drain drops: every
    // unfiltered screen in the app is about the current session, down to the
    // term chip in the header, and none of them is anybody's domain.
    await queryClient.invalidateQueries()
    return done
  },
  idempotent: true,
  collectionId: SET.refSessions,
})

registerHandler<number>(WRITE.setCurrentTerm, {
  send: async (id) => {
    const done = await settingsService.setCurrentTerm(id)
    await queryClient.invalidateQueries()
    return done
  },
  idempotent: true,
  collectionId: SET.refTerms,
})

/**
 * The settings row itself — who the school is on every document, and the
 * dates the term runs to. Idempotent: the whole row is written, so a replay
 * writes the same row again.
 */
registerHandler<SettingsBody>(WRITE.updateSettings, {
  send: (body) => settingsService.update(body),
  idempotent: true,
  collectionId: SET.refSettings,
})
