import { loginNote } from '@/api/parents/login-note'
import { parentsService } from '@/api/parents/service'
import type { ParentBody } from '@/api/parents/types'
import type { Id } from '@/api/types'
import { SET, WRITE } from '../ids'
import { idUnder } from '../new-id'
import { registerHandler } from '../registry'

/**
 * The households a school keeps, and whether their sign-in works.
 *
 * Creating one is **not** idempotent — the school issues the id and, once, the
 * first password.
 *
 * That password is the reason this one is worth a note. `POST /sparents` is the
 * only place it is ever said, and a household written with no connection gets
 * its answer from the drain rather than from the form — so the drain says it,
 * and says it in a toast that stays up until somebody closes it. The office
 * gets the credentials late rather than not being able to register a guardian
 * at all, which for a school with no signal for days is the better trade.
 */
registerHandler<ParentBody>(WRITE.createParent, {
  send: (body) => parentsService.create(body),
  idempotent: false,
  newId: idUnder('sparent'),
  collectionId: SET.refParents,
  note: loginNote,
})

registerHandler<{ id: Id; body: ParentBody }>(WRITE.updateParent, {
  send: ({ id, body }) => parentsService.update(id, body),
  idempotent: true,
  collectionId: SET.refParents,
})

/**
 * Refused with 409 while a student still points at the household, which the
 * drain treats as terminal and puts in front of a person — the confirm on the
 * button already says so.
 */
registerHandler<Id>(WRITE.removeParent, {
  send: (id) => parentsService.remove(id),
  idempotent: true,
  collectionId: SET.refParents,
})

/**
 * Blocking the sign-in, or giving it back. Idempotent: the op says which of the
 * two the household should end in. The household, its children and its invoices
 * all stay either way — this is the one distinction the API draws between
 * guardian accounts.
 */
registerHandler<{ id: Id; active: boolean }>(WRITE.setParentAccess, {
  send: ({ id, active }) =>
    active ? parentsService.activate(id) : parentsService.deactivate(id),
  idempotent: true,
  collectionId: SET.refParents,
})
