import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { StudentPerformance } from '@/features/performance/components/student-performance'
import { useSelectedChild } from '../../parent.store'

/**
 * How one child is actually getting on, for the guardian who pays for it.
 *
 * The child comes from the switcher in the shell above, so this page follows
 * whichever child is being read everywhere else in the portal rather than
 * asking again.
 *
 * No session or term pickers here, and no class figures at all. A guardian is
 * shown their own child measured against themselves — which subjects they are
 * strong in relative to their own average, and whether they are in school for
 * it — and never the class's average: in a class of three, a class average is
 * one subtraction away from another family's child.
 */
export function ParentPerformancePage() {
  const child = useSelectedChild()

  return (
    <div>
      <PageHeader
        kicker="My children"
        title={`Progress — ${child.full}`}
        description="Term by term, and every subject measured against this child's own average — which is the comparison the report sheet cannot make. Only marks the school has approved are counted, so these figures match the report sheet."
      />
      <Rule />
      <StudentPerformance
        key={child.id}
        studentId={child.id > 0 ? child.id : undefined}
        noStudentTitle="No child is linked to your account"
        noStudentBody="Ask the school office to link your children to this account, and their progress will appear here."
      />
    </div>
  )
}
