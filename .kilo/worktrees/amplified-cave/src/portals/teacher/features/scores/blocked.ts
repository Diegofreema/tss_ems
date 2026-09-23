/**
 * Why the Save button will not go.
 *
 * A disabled button that says nothing is the worst control on a form: a
 * teacher who has typed thirty marks and cannot file them has no way to tell
 * whether the page is broken, the marks are wrong, or they have missed a step.
 * This is the one sentence that answers it, and the page shows it beside the
 * button rather than only in the footnote under the sheet.
 *
 * The order matters. A flagged mark is the reader's own to fix and comes
 * first; the term is the school's problem and is worth saying next; "nothing
 * typed yet" is last, because it is the ordinary state of a sheet just opened
 * and needs no alarm.
 */
export function blockedReason(state: {
  /** Marks above what the endpoint will take. */
  problems: number
  /** Rows typed but not filed. */
  pending: number
  /** Whether the session and term to file into are known. */
  hasTerm: boolean
  /** The school is still being asked which term it is. */
  looking: boolean
}): string {
  if (state.problems > 0) {
    return state.problems === 1
      ? 'Fix the flagged mark first.'
      : `Fix the ${state.problems} flagged marks first.`
  }
  if (!state.hasTerm) {
    return state.looking
      ? 'Checking which term to file into\u2026'
      : 'The term this would be filed into cannot be read yet.'
  }
  if (state.pending === 0) return 'Nothing typed yet.'
  return ''
}
