import type { CollectionDef } from './types.ts'

/**
 * Why this form cannot be saved right now, if it cannot.
 *
 * A definition that writes through the outbox can always be saved — that is
 * what the outbox is for. One that still writes straight to the school cannot
 * be saved without the school, and saying so beside the button is the honest
 * version of letting somebody fill in two pages and then fail.
 *
 * The two kinds that stay on the wire are named in CLAUDE.md and both are here
 * for a reason rather than for want of migrating: a form carrying a file has no
 * body the queue could hold, and a create that reads the school before writing
 * — a student's enrolment asks which session is current — has nothing to read
 * when there is no school to ask.
 */
export function blockedReason(
  definition: Pick<CollectionDef, 'queue'>,
  online: boolean,
): string | undefined {
  if (online || definition.queue) return undefined
  return 'This one needs a connection. It is not a form your device can hold on to — try again once you are back online.'
}
