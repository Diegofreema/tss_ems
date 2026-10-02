import { useMemo } from 'react'
import { adminsService } from '@/api/admins/service'
import { useSessionStore } from '@/stores/session.store'
import { type Access, accessOf, holds, mayOpen, type Section } from './privileges'
import { adminProfile } from './session'

/**
 * Asks the school what the signed-in administrator was granted, and keeps it
 * beside the identity.
 *
 * `GET /admins/{id}/privileges` first, because it is where the office edits
 * them. An account without the Admin section may well be refused it about
 * itself, so its own record (`/admins/profile`, which carries the same list)
 * answers next — and failing both, nothing is written, so the device goes on
 * offering what it was last told rather than shutting the portal on a dropped
 * connection.
 *
 * Never throws: the shell route that calls it must not.
 */
export async function loadPrivileges(): Promise<void> {
  const admin = adminProfile(useSessionStore.getState().account)
  if (!admin) return
  const keep = (privileges: unknown) => {
    // Only a list is an answer; anything else would be read as holding nothing.
    if (Array.isArray(privileges)) useSessionStore.getState().setPrivileges(privileges)
    return Array.isArray(privileges)
  }

  const fromEndpoint = await adminsService
    .privileges(admin.id)
    .then((answer) => keep(answer.admin?.privileges))
    .catch(() => false)
  if (fromEndpoint) return

  await adminsService
    .profile()
    .then((own) => keep(own.privileges))
    .catch(() => false)
}

/**
 * Readies the privileges before the office's portal draws. Awaited only the
 * first time on a device, when there is nothing kept to draw the rail from;
 * after that the kept copy opens the portal and the answer lands behind it.
 */
export async function readyPrivileges(): Promise<void> {
  if (useSessionStore.getState().privileges === null) await askOnce()
  else if (Date.now() - askedAt >= FRESH_FOR) void askOnce()
}

/**
 * The shell's `beforeLoad` runs on every navigation inside the portal, so
 * the kept copy is asked again at most this often — the same 30s the school's
 * sets are held fresh for. A grant made in another office still shows within
 * half a minute of the next click, without a request on every one.
 */
const FRESH_FOR = 30_000
let askedAt = 0
let asking: Promise<void> | null = null

function askOnce(): Promise<void> {
  if (!asking) {
    askedAt = Date.now()
    asking = loadPrivileges().finally(() => {
      asking = null
    })
  }
  return asking
}

/** What the signed-in account may reach, redrawn when either half changes. */
export function useAccess(): Access {
  const account = useSessionStore((state) => state.account)
  const privileges = useSessionStore((state) => state.privileges)
  return useMemo(() => accessOf(account, privileges), [account, privileges])
}

/** A test of one path, for the shell: its rail, its header and its outlet. */
export function useOfficeMayOpen(): (path: string) => boolean {
  const access = useAccess()
  return useMemo(() => (path: string) => mayOpen(access, path), [access])
}

/**
 * The same questions asked outside React — by a collection definition, which
 * is a plain object built before anything renders and asks at the moment a
 * tab or a button is about to be drawn.
 */
export function currentAccess(): Access {
  const { account, privileges } = useSessionStore.getState()
  return accessOf(account, privileges)
}

export const officeHolds = (section: Section): boolean => holds(currentAccess(), section)
