import type { TagTone } from '../components/common/tag-tone.ts'

// 'Not current' is settled, not good news: four sessions out of five are not
// the current one, and painting every last one of them green would read as
// four endorsements. It stays quiet.
const GOOD = ['Active', 'Paid', 'Cleared', 'Approved', 'Marked', 'Current', 'Present', 'Excused', 'Enabled', 'Available', 'Completed', 'Admitted', 'In this arm', 'Submitted', 'Correct', 'Returned']
// Live now, and the reason it is not green: an open assignment is not good
// news, it is **the one somebody has to do something about**. Green would put
// it beside 'Submitted' on the student's own list — an assignment still to sit
// painted exactly like one already handed in, which is the opposite reading.
const ACCENT = ['Open']
// Settled: over, withdrawn, or never current. Nothing to do and nothing wrong.
// 'Unavailable' is settled either way it arises: a title the office retired,
// or one down to the reference copy the library keeps back. Nothing is wrong
// and nothing is owed — it simply does not go out. Red is for 'All out',
// which is the one that says the shelf is empty.
const QUIET = ['Not current', 'Closed', 'Inactive', 'Unavailable']
const BAD = ['Overdue', 'Unpaid', 'Suspended', 'Not marked', 'All out', 'Rejected', 'Sent back', 'Declined', 'Owing', 'Not placed', 'Absent', 'Disabled', 'Deactivated', 'Missed', 'Wrong', 'No questions']

/**
 * The design colours a status by what it means, not by which table it is in:
 * good news reads green, states needing action read red, settled states are
 * quiet, and anything in between is outlined.
 *
 * An assignment's five states were the case that showed why 'in between' is
 * not a resting place: 'Open' and 'Not open yet' both fell through to the
 * outline, so a register of papers a class can sit and papers it cannot read
 * as one colour down the page — which is the column's whole job undone. They
 * are the opposite answer to the only question anybody asks that register.
 *
 * They now use four of the five tones between them, which is the most a status
 * column can carry and exactly what these five states need:
 *
 *  - **Open** — accent. Live, and somebody's to act on.
 *  - **Not open yet** — outlined. Coming, and nothing to do about it today.
 *  - **Closed** and **Inactive** — quiet. Over or withdrawn. These two share a
 *    tone deliberately: both mean "not live, nothing to do", and telling them
 *    apart matters far less than telling either from 'Open'. The word in the
 *    chip already says which.
 *  - **No questions** — red, on the same reasoning as 'Not marked': it is the
 *    outstanding job. A paper holding nothing cannot be sat however open its
 *    window is, and the register's own footer promises it first.
 *
 * On the student's list the same four tones fall out as Open, Not open yet,
 * Submitted and Missed — all four distinct, which is the property the test
 * asserts so a future addition cannot quietly collapse two of them.
 */
export function toneForStatus(status: string): TagTone {
  if (ACCENT.includes(status)) return 'accent'
  if (GOOD.includes(status)) return 'good'
  if (QUIET.includes(status)) return 'neutral'
  if (BAD.includes(status)) return 'bad'
  return 'outline'
}
