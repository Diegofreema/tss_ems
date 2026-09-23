import { useQuery } from '@tanstack/react-query'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import { SectionHeading } from '@/components/common/section-heading'
import { SegmentedControl } from '@/components/common/segmented-control'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { optionsQuery } from '@/features/collections/option-feeds'
import { DEFAULT_LIMIT } from './analytics'
import { AnalyticsFilters, type FilterField, type Filters } from './analytics-filters'
import { EnrolmentPanel } from './enrolment-panel'
import { GradesPanel } from './grades-panel'
import { MoneyPanel } from './money-panel'

const TABS = ['grades', 'money'] as const
type Tab = (typeof TABS)[number]

const TAB_OPTIONS = [
  { value: 'grades', label: 'Grades' },
  { value: 'money', label: 'Money' },
] as const satisfies readonly { value: Tab; label: string }[]

/** The filters each tab's endpoints actually take. Nothing else is drawn. */
const TAB_FILTERS: Record<Tab, readonly FilterField[]> = {
  // result-analytics?subject_id&session_id
  grades: ['session', 'subject'],
  // financial-analytics?session_id and payments?session_id&limit
  money: ['session', 'limit'],
}

/**
 * The office's analytics: who is enrolled, what they scored and what was
 * paid, off the four `/admins` reads that answer for the school as a whole.
 *
 * Enrolment sits above the tabs because it takes no parameters — it is the
 * school as it stands. The two comparisons below it are each a question about
 * one session, and they are tabbed apart so the filter bar can show only the
 * filters the endpoints on screen actually send.
 *
 * Every figure here is the API's own. Nothing is added up from a register
 * this page pulled itself, which is deliberate — the dashboard already does
 * that for money, and two pages totalling the same ledger different ways is
 * how a school ends up with two answers to one question.
 */
export function AdminAnalyticsPage() {
  const [state, setState] = useQueryStates({
    tab: parseAsStringLiteral(TABS).withDefault('grades'),
    session: parseAsString.withDefault(''),
    subject: parseAsString.withDefault(''),
    limit: parseAsString.withDefault(DEFAULT_LIMIT),
  })

  const sessions = useQuery(optionsQuery('sessions', ''))
  const subjects = useQuery(optionsQuery('subjects', ''))

  // Neither comparison has a default of its own, so the page picks one: the
  // newest session, which is the order the feed already sends them in, and
  // the first subject on the register. Both are only until something is
  // chosen, and what was chosen lives in the URL so the view can be shared.
  const session = state.session || sessions.data?.[0]?.value || ''
  const subject = state.subject || subjects.data?.[0]?.value || ''
  const values: Filters = { session, subject, limit: state.limit }

  const onChange = useCallback((next: Filters) => void setState(next), [setState])
  const onTab = useCallback((tab: Tab) => void setState({ tab }), [setState])

  const sessionId = Number(session) || undefined
  const subjectId = Number(subject) || undefined
  const sessionName = sessions.data?.find((option) => option.value === session)?.label

  return (
    <div>
      <PageHeader
        kicker="Finance"
        title="Analytics"
        description="Who is enrolled, and how grades and money collected compare against the session before. Every figure on this page is the API's own."
      />
      <Rule />

      <SectionHeading className="mb-4">Enrolment</SectionHeading>
      <EnrolmentPanel />

      <Rule className="mt-8" />

      <SegmentedControl
        name="analytics-tab"
        className="mb-6"
        options={TAB_OPTIONS}
        value={state.tab}
        onChange={onTab}
      />

      <AnalyticsFilters
        fields={TAB_FILTERS[state.tab]}
        values={values}
        sessions={sessions.data ?? []}
        subjects={subjects.data ?? []}
        onChange={onChange}
      />

      {state.tab === 'grades' ? (
        <GradesPanel
          sessionId={sessionId}
          subjectId={subjectId}
          filtersPending={sessions.isPending || subjects.isPending}
        />
      ) : (
        <MoneyPanel
          sessionId={sessionId}
          sessionName={sessionName}
          limit={Number(state.limit) || Number(DEFAULT_LIMIT)}
          filtersPending={sessions.isPending}
        />
      )}
    </div>
  )
}
