import type { Id } from '../api/types.ts'

/**
 * Where the school's new id is, in the answer a create came back with.
 *
 * A queued create names its row `local:<uuid>` because the id is the school's
 * to issue. When the op lands, the real id has to be written down against that
 * name — `idMap` in `store.ts` — or anything queued behind it that refers to
 * the new row has nothing to resolve to.
 *
 * This has to be told, never guessed. Every create on this API answers with
 * the record nested under a key of its own — `{student}`, `{sparent}`,
 * `{class_arm}`, `{semester}` — and the key is the API's word, not a
 * transformation of the path: terms live under `semesters` and answer with
 * `semester`, arms answer with `class_arm`. Reading `answer.id` finds nothing
 * in any of them, which is the bug this replaced: every queued enrolment
 * landed correctly at the school and recorded no id at all.
 *
 * Nor can the wrapper simply be unwrapped by taking its only key. Creating a
 * guardian answers `{sparent, username, password}` — three keys, because the
 * school issues the guardian's login at the same time and `loginNote` reads
 * it out. A rule that took "the only key" would have had to special-case that
 * one anyway, and a rule with one exception is two rules.
 */
export function idUnder(key: string): (answer: unknown) => Id | undefined {
  return (answer) => idOf(record(answer)?.[key])
}

/**
 * For the handful whose `send` already unwrapped it — `setassignments`
 * answers `{paper}` and its handler hands the paper on, since the rest of the
 * envelope is nothing to anybody.
 */
export const idOfAnswer = (answer: unknown): Id | undefined => idOf(answer)

/**
 * This write creates nothing the device will ever name.
 *
 * Written out rather than left off, because leaving it off is what the old
 * reader did by accident. A handler that says this is a handler somebody
 * decided about: a mail to the office has no row, and the two conversation
 * endpoints answer with a shape nobody has seen — bronze has never run them.
 */
export const noNewId = (): undefined => undefined

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined
}

function idOf(value: unknown): Id | undefined {
  const id = record(value)?.id
  return typeof id === 'string' || typeof id === 'number' ? id : undefined
}
