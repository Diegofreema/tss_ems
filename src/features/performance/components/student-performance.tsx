import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import { useStudentPerformance } from '@/api/performance/hooks'
import type { StudentPerformanceParams } from '@/api/performance/types'
import { BarChart } from '@/components/charts/bar-chart'
import { RateBars } from '@/components/charts/rate-bars'
import { SectionHeading } from '@/components/common/section-heading'
import { Tag } from '@/components/common/tag'
import { EmptyState } from '@/components/feedback/empty-state'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { optionsQuery } from '@/features/collections/option-feeds'
import { cn } from '@/lib/utils'
import { directionTone, figure, signed, subjectLines, termLines } from '../performance'
import { DuplicateNotice, Footnote, PendingNotice, Section } from './section'

/**
 * One student's progress: where they are going, which subjects are carrying
 * them and which are not, and whether they are in school for it.
 *
 * The comparison that matters here is a student against **themselves**. A child
 * on 55 who scores 80 everywhere else is struggling; a child on 55 in a class
 * averaging 40 is not — and the report sheet, which ranks them against the
 * class, cannot say either. So every subject is shown with its distance from
 * the student's own average, and that gap is what the eye is drawn to.
 *
 * Only approved marks count, which is what makes this agree with the report
 * sheet. Anything unapproved is counted and named rather than dropped, and can
 * be shown on request as a provisional picture that says it is one.
 */
export function StudentPerformance({
  studentId,
  canScope = false,
  noStudentTitle = 'No student to show',
  noStudentBody = 'Ask the school office to link a student to this account.',
}: {
  studentId: number | undefined
  /** Whether this reader may narrow by session and term. A student may not. */
  canScope?: boolean
  noStudentTitle?: string
  noStudentBody?: string
}) {
  const [state, setState] = useQueryStates({
    session: parseAsString.withDefault(''),
    term: parseAsString.withDefault(''),
    pending: parseAsString.withDefault(''),
  })

  const sessions = useQuery({ ...optionsQuery('sessions', ''), enabled: canScope })
  const terms = useQuery({ ...optionsQuery('terms', ''), enabled: canScope })

  const including = state.pending === '1'
  const params: StudentPerformanceParams = {
    ...(canScope && state.session ? { session_id: Number(state.session) } : {}),
    ...(canScope && state.term ? { semester_id: Number(state.term) } : {}),
    ...(including ? { include_pending: 1 as const } : {}),
  }

  const { data, isPending, error } = useStudentPerformance(studentId, params)

  if (!studentId) {
    return <EmptyState title={noStudentTitle} body={noStudentBody} />
  }

  const history = termLines(data?.terms ?? [])
  const subjects = subjectLines(data?.subjects ?? [], data?.own_average ?? null)
  const attendance = data?.attendance
  const drawn = history.filter((term) => term.average !== undefined)
  const peak = Math.max(100, ...drawn.map((term) => term.average ?? 0))
  const strongest = rowName(data?.strongest)
  const weakest = rowName(data?.weakest)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3.5">
        {canScope && (
          <>
            <Picker
              label="Session"
              value={state.session}
              onChange={(session) => void setState({ session })}
              options={sessions.data ?? []}
              anyLabel="Every session"
            />
            <Picker
              label="Term"
              value={state.term}
              onChange={(term) => void setState({ term })}
              options={terms.data ?? []}
              anyLabel="Every term"
            />
          </>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={including}
            onChange={(event) =>
              void setState({ pending: event.target.checked ? '1' : '' })
            }
            className="size-3.5"
          />
          Include marks nobody has approved yet
        </label>
      </div>

      <Section
        pending={isPending}
        error={error}
        note={data && !history.length && !subjects.length ? data.message : null}
      >
        <TileStrip
          size="lg"
          tiles={[
            {
              label: 'Own average',
              value: figure(data?.own_average, '%'),
              delta: data?.student.class_arm ?? undefined,
              deltaTone: 'muted',
            },
            {
              label: 'Direction',
              value: data?.direction ?? '—',
              delta:
                history.length > 1
                  ? `across ${history.length} terms`
                  : 'one term on file',
              deltaTone: directionTone(data?.direction ?? null),
            },
            {
              label: 'Attendance',
              value: figure(attendance?.rate, '%'),
              delta: attendance?.marked
                ? `${attendance.marked} day${attendance.marked === 1 ? '' : 's'} marked`
                : 'no register marked',
              deltaTone: 'muted',
            },
            {
              label: 'Awaiting approval',
              value: String(data?.pending_excluded ?? 0),
              delta: including
                ? 'counted in these figures'
                : 'left out of these figures',
              deltaTone: (data?.pending_excluded ?? 0) > 0 ? 'alert' : 'muted',
            },
          ]}
        />

        <PendingNotice count={data?.pending_excluded ?? 0} including={including} />
        <DuplicateNotice count={data?.duplicates.length ?? 0} />

        <Rule className="mt-8" />
        <SectionHeading>Term by term</SectionHeading>
        {drawn.length ? (
          <>
            <BarChart
              peak={peak}
              bars={drawn.map((term, index) => ({
                label: term.name,
                value: term.average ?? 0,
                display: figure(term.average),
                highlight: index === drawn.length - 1,
              }))}
            />
            <Footnote>
              In the order the terms happened, newest on the right. Each bar is
              the average of the approved marks for that term.
            </Footnote>
          </>
        ) : (
          <Footnote>
            No term has an average yet, so there is no line to draw.
          </Footnote>
        )}

        <Rule className="mt-8" />
        <SectionHeading>
          Every subject, against this student&rsquo;s own average
        </SectionHeading>
        {subjects.length ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-divider text-left">
                    <Th>Subject</Th>
                    <Th align="right">Average</Th>
                    <Th align="right">Against own average</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr
                      key={subject.key}
                      className="border-b border-divider last:border-b-0"
                    >
                      <td className="px-4 py-2.75 font-medium">{subject.name}</td>
                      <td className="px-4 py-2.75 text-right tabular-nums">
                        {figure(subject.average)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-2.75 text-right font-heading font-extrabold tabular-nums',
                          subject.gap === undefined
                            ? 'text-muted-foreground'
                            : subject.gap >= 0
                              ? 'text-success-ink'
                              : 'text-danger-ink',
                        )}
                      >
                        {signed(subject.gap)}
                      </td>
                      <td className="px-4 py-2.75">
                        {subject.name === strongest && (
                          <Tag variant="good">Strongest</Tag>
                        )}
                        {subject.name === weakest && (
                          <Tag variant="bad">Needs work</Tag>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Footnote>
              A plus means the student does better in that subject than they do
              overall, a minus that they do worse. It is not a comparison with
              the class — a child on 55 in a class averaging 40 is doing well,
              and this column would still read as a minus if their other
              subjects were stronger.
            </Footnote>
          </>
        ) : (
          <Footnote>No approved marks in any subject for this period.</Footnote>
        )}

        <Rule className="mt-8" />
        <SectionHeading>Attendance</SectionHeading>
        {attendance && attendance.marked > 0 ? (
          <>
            {/*
              One bar, and it is the present rate — because `RateBars` inks a
              low figure as a problem, which is right for attendance and
              exactly wrong for absences: three red bars reading 9%, 5% and 3%
              would say a child who is almost always in school is in trouble.
              The threshold is the school's own, the one `/performance/at-risk`
              uses.
            */}
            <RateBars
              weakBelow={75}
              rates={[share('Present', attendance.present, attendance.marked)]}
            />
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
              {[
                ['Absent', attendance.absent],
                ['Late', attendance.late],
                ['Excused', attendance.excused],
              ].map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-lg border border-divider bg-raised px-4 py-3 shadow-card"
                >
                  <div className="text-2xs uppercase tracking-label text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-1 font-heading text-xl font-extrabold tabular-nums">
                    {count}
                  </div>
                  <div className="mt-0.5 text-2xs text-muted-foreground">
                    of {attendance.marked} days marked
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Footnote>
            {attendance?.reading ??
              'No register has been marked for this student in this period.'}
          </Footnote>
        )}
      </Section>
    </div>
  )
}

/** One row of the attendance breakdown, as a share of the days marked. */
function share(label: string, count: number, marked: number) {
  return {
    label,
    percent: marked > 0 ? Math.round((count / marked) * 100) : 0,
    amount: `${count} of ${marked}`,
  }
}

/**
 * The strongest and weakest subjects arrive as whole subject rows in a shape
 * nobody has seen, so they are matched by the name they read as rather than by
 * an id that may not be there. A blank stands for "no such subject", which no
 * real subject name matches.
 */
function rowName(subject: Record<string, unknown> | null | undefined): string {
  if (!subject) return ' '
  return subjectLines([subject], null)[0].name
}

function Th({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-2xs font-normal tracking-label uppercase text-muted-foreground',
        align === 'right' && 'text-right',
      )}
    >
      {children}
    </th>
  )
}

function Picker({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  anyLabel: string
}) {
  return (
    <div>
      <div className="mb-1.25 text-xs text-foreground/70">{label}</div>
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 min-w-[10rem] rounded-md border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
