import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { schoolingRecord } from '@/db/collections/schooling'
import { useHeldDocument } from '@/db/live'
import { StudentPerformance } from '@/features/performance/components/student-performance'

/**
 * A student's own progress.
 *
 * The one comparison worth showing a child is with themselves: which subjects
 * they do better in than they do overall, and which they do worse in. Ranking
 * against the class is the report sheet's job and is not repeated here.
 *
 * The student's id comes off their own record on the device, so the page knows
 * who is asking with no connection — only the figures need the school. No
 * session or term pickers: a student login is refused `/sessions` and
 * `/semesters`, so offering them would be offering two empty dropdowns.
 */
export function StudentPerformancePage() {
  const { doc: student } = useHeldDocument(schoolingRecord)

  return (
    <div>
      <PageHeader
        kicker="My schooling"
        title="My progress"
        description="How you are doing across the terms, and how each subject compares with your own average. Only marks your teachers have had approved are counted, so this agrees with your report sheet."
      />
      <Rule />
      <StudentPerformance
        key={student?.id ?? 'none'}
        studentId={student?.id}
        noStudentTitle="Your record is not on this device yet"
        noStudentBody="Open the portal once with a connection and your own record will be here from then on, signal or no signal."
      />
    </div>
  )
}
