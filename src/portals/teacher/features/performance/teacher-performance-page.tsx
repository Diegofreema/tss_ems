import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useMemo } from 'react'
import { SegmentedControl } from '@/components/common/segmented-control'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { teacherRoll } from '@/db/collections/teaching'
import { useHeld } from '@/db/live'
import type { TeacherStudent } from '@/api/teaching/types'
import { ClassPerformance } from '@/features/performance/components/class-performance'
import { StudentLookup } from '@/features/performance/components/student-lookup'

const SCOPES = ['class', 'student'] as const
type Scope = (typeof SCOPES)[number]

/**
 * A teacher's read of how their own classes are doing.
 *
 * The same four questions the office asks, narrowed to the classes and arms
 * this teacher actually takes — the class picker reads `my-classes` rather
 * than the office's whole list, so a teacher is never offered a class they
 * cannot see the marks for.
 *
 * The student side picks off the teacher's **own roll**, which is already a set
 * on the device. So finding a child costs no request and works with no signal;
 * only their figures need the school, and the panel says so where it cannot
 * reach it.
 */
export function TeacherPerformancePage() {
  const [scope, setScope] = useQueryState(
    'scope',
    parseAsStringLiteral(SCOPES).withDefault('class'),
  )
  const roll = useHeld<TeacherStudent, number>(teacherRoll)

  const students = useMemo(
    () =>
      roll.rows
        .map((student) => ({
          value: String(student.id),
          label: [
            [student.fname, student.mname, student.lname].filter(Boolean).join(' ').trim(),
            student.regno,
          ]
            .filter(Boolean)
            .join(' · '),
        }))
        .sort((one, two) => one.label.localeCompare(two.label)),
    [roll.rows],
  )

  return (
    <div>
      <PageHeader
        kicker="Assessment"
        title="Performance"
        description="How your classes and your students are doing, worked out from the approved marks and the register. A prompt to look at a child, never a decision about one."
      />
      <Rule />

      <SegmentedControl<Scope>
        name="performance-scope"
        className="mb-6"
        options={[
          { value: 'class', label: 'A class' },
          { value: 'student', label: 'One student' },
        ]}
        value={scope}
        onChange={(next) => void setScope(next)}
      />

      {scope === 'class' ? (
        <ClassPerformance classesFeed="my-classes" armsFeed="my-arms" />
      ) : (
        <StudentLookup
          options={students}
          pending={roll.pending}
          hint={
            roll.failed
              ? 'Your roll has never reached this device, so there is nobody to choose from. Open this page once with a connection.'
              : 'Nobody is on your roll this session, so there is no student to read.'
          }
        />
      )}
    </div>
  )
}
