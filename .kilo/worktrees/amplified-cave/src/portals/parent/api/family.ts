import type { Account } from '@/api/auth/types'
import type { Parent } from '@/api/parents/types'

/**
 * The guardian record behind the signed-in account, when there is one.
 *
 * Nothing is scoped by it — every read resolves the household from the token —
 * but it still says whether the caller is a guardian at all.
 */
export function parentIdOf(account: Account | null | undefined): number | null {
  const type = account?.profile_type
  if (type !== 'parent' && type !== 'sparent') return null
  return (account?.profile as Parent | undefined)?.id ?? null
}

/*
 * The household used to be composed here, by one query that fanned out over
 * `sparents/my-children`, `sparents/my-invoices` and a register per child.
 *
 * It is now three collections on the guardian's own device — see
 * `src/db/collections/parent.ts` — read live and composed by `composeFamily`
 * in `../family.ts`. The endpoints and the reading are unchanged; only where
 * the rows sit between them has moved, which is what lets the portal open in a
 * village with no signal.
 */
