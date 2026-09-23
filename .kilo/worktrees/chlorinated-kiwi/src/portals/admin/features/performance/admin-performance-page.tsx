import { useQuery } from '@tanstack/react-query'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { useCallback, useState } from 'react'
import { SegmentedControl } from '@/components/common/segmented-control'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { searchOptionsQuery } from '@/features/collections/option-feeds'
import { ClassPerformance } from '@/features/performance/components/class-performance'
import { StudentLookup } from '@/features/performance/components/student-lookup'

const SCOPES = ['class', 'student'] as const
type Scope = (typeof SCOPES)[number]

/**
 * The office's read of how the school is actually doing.
 *
 * Not the report sheet, which says who came top, and not the analytics, which
 * count enrolment and money. This is arithmetic over the marks and the
 * register — who moved, which subjects a class is losing, which children the
 * thresholds want somebody to look at — and every figure on it can be checked
 * by hand, which is the reason it is allowed to exist at all.
 *
 * Two scopes, because they are two different jobs: a head of department opens
 * a class, and a form teacher or a bursar fielding a phone call opens one
 * child. The student side searches the whole register at the school, which is
 * the same searched feed the fee counter uses.
 */
export function AdminPerformancePage() {
  const [scope, setScope] = useQueryState(
    'scope',
    parseAsStringLiteral(SCOPES).withDefault('class'),
  )
  const [term, setTerm] = useState('')
  const students = useQuery({
    ...searchOptionsQuery('students', term),
    enabled: scope === 'student',
  })

  // Stable, so the lookup's debounce does not re-fire on every render.
  const onTerm = useCallback((next: string) => setTerm(next), [])

  return (
    <div>
      <PageHeader
        kicker="Academics"
        title="Performance"
        description="How a class, a student or a paper is actually doing, worked out from the approved marks and the register. Nothing here predicts anything, and every figure can be checked by hand."
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
        <ClassPerformance />
      ) : (
        <StudentLookup
          options={students.data ?? []}
          pending={students.isPending}
          onTerm={onTerm}
          hint="Type a name or an admission number to find a student."
        />
      )}
    </div>
  )
}
