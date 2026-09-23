import type { TagProps } from '@/components/common/tag'

// 'Not current' is settled, not withdrawn: four sessions out of five are not
// the current one, and outlining every last one of them in accent would read
// as four problems.
const GOOD = ['Active', 'Paid', 'Cleared', 'Approved', 'Marked', 'Current', 'Not current', 'Present', 'Excused', 'Enabled', 'Available', 'Completed', 'Admitted', 'In this arm', 'Submitted', 'Correct']
const BAD = ['Overdue', 'Unpaid', 'Suspended', 'Not marked', 'All out', 'Rejected', 'Sent back', 'Declined', 'Owing', 'Not placed', 'Absent', 'Disabled', 'Deactivated', 'Missed', 'Wrong']

/**
 * The design colours a status by what it means, not by which table it is in:
 * settled states read as neutral, states needing action read as accent, and
 * anything in between is outlined.
 */
export function toneForStatus(status: string): NonNullable<TagProps['variant']> {
  if (GOOD.includes(status)) return 'neutral'
  if (BAD.includes(status)) return 'accent'
  return 'outline'
}
