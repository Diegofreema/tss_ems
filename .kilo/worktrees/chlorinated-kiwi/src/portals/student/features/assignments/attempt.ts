import type { Draft } from './assignment.ts'

/**
 * A sitting in progress, kept in the browser so that leaving the assignment and
 * coming back resumes it instead of starting it again.
 *
 * The clock used to live in React state alone, which meant a reload — or the
 * back button, or a tab closing — handed the student the full time allowed a
 * second time, and took their answers away in the same movement. This is both
 * halves of that: the deadline the sitting is already running to, and what has
 * been answered so far.
 *
 * **This is not proof against a determined student, and cannot be.** Clearing
 * site data, a private window or another browser all produce a fresh attempt,
 * and the value here can be edited by anybody who opens devtools. The only
 * cheat-proof deadline is one the server stamps when the assignment is started
 * and enforces when it is submitted; the shape below is deliberately the shape
 * such an endpoint would answer with, so adopting it later means filling
 * `startedAt` and `expiresAt` from the response instead of from this device and
 * changing nothing else.
 */
export type StoredAttempt = {
  /**
   * The assignment being sat. Checked on the way out as well as in the key, so
   * a stored value that somehow belongs to another assignment is discarded
   * rather than resumed against this one.
   */
  assignmentId: string
  /** School-clock ms at the moment the student pressed Start. */
  startedAt: number
  /** School-clock ms when the time runs out, or null where nothing limits it. */
  expiresAt: number | null
  /** What has been answered so far, by question id. */
  draft: Draft
}

const KEY_PREFIX = 'netpro.assignment'

/**
 * Keyed by the signed-in student as well as the assignment: a school laptop is
 * shared, and inheriting somebody else's clock — or worse, their answers —
 * would be a far larger bug than the one this fixes.
 */
export function attemptKey(owner: string, assignmentId: string): string {
  return `${KEY_PREFIX}.${owner}.${assignmentId}`
}

/**
 * The attempt in progress, or null where there is none to resume.
 *
 * Nothing is stored for a caller with no identity: an attempt that cannot be
 * tied to a student is one the next person on the device would inherit.
 */
export function readAttempt(owner: string, assignmentId: string): StoredAttempt | null {
  if (!owner) return null
  try {
    const stored = globalThis.localStorage?.getItem(attemptKey(owner, assignmentId))
    return stored ? parseAttempt(JSON.parse(stored), assignmentId) : null
  } catch {
    // Private-mode storage throws, and so does a half-written value. Either way
    // there is no attempt to resume, and the sitting starts as it always did.
    return null
  }
}

export function writeAttempt(owner: string, attempt: StoredAttempt): void {
  if (!owner) return
  try {
    globalThis.localStorage?.setItem(
      attemptKey(owner, attempt.assignmentId),
      JSON.stringify(attempt),
    )
  } catch {
    // As above: the sitting carries on in memory for as long as the page lives.
  }
}

export function clearAttempt(owner: string, assignmentId: string): void {
  if (!owner) return
  try {
    globalThis.localStorage?.removeItem(attemptKey(owner, assignmentId))
  } catch {
    // As above.
  }
}

/**
 * A stored value read back, or null where it is not one.
 *
 * Everything is checked rather than trusted. The store is a text file the
 * student can edit, and a sitting that threw on the way in would lock them out
 * of an assignment they are entitled to sit.
 */
export function parseAttempt(value: unknown, assignmentId: string): StoredAttempt | null {
  if (!value || typeof value !== 'object') return null
  const stored = value as Record<string, unknown>

  if (stored.assignmentId !== assignmentId) return null
  if (typeof stored.startedAt !== 'number' || !Number.isFinite(stored.startedAt)) return null

  const expiresAt =
    typeof stored.expiresAt === 'number' && Number.isFinite(stored.expiresAt)
      ? stored.expiresAt
      : null
  if (stored.expiresAt != null && expiresAt === null) return null

  return { assignmentId, startedAt: stored.startedAt, expiresAt, draft: draftOf(stored.draft) }
}

/** The answers, keeping only what could have come from this assignment. */
function draftOf(value: unknown): Draft {
  const draft: Draft = {}
  if (!value || typeof value !== 'object') return draft
  for (const [key, answer] of Object.entries(value as Record<string, unknown>)) {
    const questionId = Number(key)
    if (!Number.isInteger(questionId)) continue
    if (typeof answer === 'number' || typeof answer === 'string') draft[questionId] = answer
  }
  return draft
}

/**
 * When a sitting that started now would run out.
 *
 * The earlier of the two things that can end it: the time allowed, and the
 * assignment closing. An assignment with no time limit has no countdown at all
 * — running one down to a deadline the school never set would be inventing one
 * — so the closing time only ever brings a limit forward, never creates it.
 *
 * A closing time that has already passed is ignored. The server decides whether
 * an assignment can be sat, and it has just said yes; a clock disagreeing by a
 * few seconds must not submit the student's blank paper the moment they start.
 */
export function attemptExpiry(
  startedAt: number,
  limitSeconds: number | null,
  closesAt: number | null,
): number | null {
  if (limitSeconds === null) return null
  const byLimit = startedAt + limitSeconds * 1000
  if (closesAt === null || closesAt <= startedAt) return byLimit
  return Math.min(byLimit, closesAt)
}
