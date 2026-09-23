/**
 * The school refusing a submission because this paper is already in.
 *
 * `POST /assignments/{id}/submit` answers 409 for an assignment the caller has
 * already sat — one attempt is the rule, and the school is the only thing that
 * actually enforces it.
 *
 * That matters more here than it looks, because **this portal cannot tell in
 * advance**. The three fields that would say so all come back wrong for a
 * pupil who has sat a paper: the list sends `submitted: false` and
 * `my_status: "available"`, and the detail sends `my_submission: null` — read
 * off bronze 2026-09-16 for a pupil whose four submissions the teacher's side
 * and the result route can both see. So the brief offers "Start the
 * assignment" on a paper already handed in, and the refusal at the end is the
 * first true thing anybody says about it.
 *
 * Nothing here works around that; a guess at which submission is theirs would
 * be worse than the gap. What this does is make the moment of refusal land as
 * an explanation rather than as a failed save — the student has just spent the
 * period answering, and "Could not submit" would read as their work being
 * lost.
 *
 * Matched structurally rather than by importing `ApiError`: this module is
 * covered by `node --test`, and the status is the whole of what is needed.
 */

/** The school's own status for "you have already sat this". */
const ALREADY_SAT = 409

export function alreadySat(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  return (error as { status?: unknown }).status === ALREADY_SAT
}

/**
 * What the student is told, in the school's words where it sent any.
 *
 * The school's sentence first, because it is the one the office will repeat
 * back if the student asks; ours after it, to answer the question the student
 * will actually have — *what happened to what I just typed?*
 */
export function alreadySatNote(error: unknown): string {
  const said =
    error instanceof Error && error.message.trim() ? error.message.trim() : ''
  const ours =
    'This assignment can be taken once, and the school already has an attempt from you. What you sent the first time is what will be marked — nothing you have typed just now replaces it.'
  return said ? `${said} ${ours}` : ours
}
