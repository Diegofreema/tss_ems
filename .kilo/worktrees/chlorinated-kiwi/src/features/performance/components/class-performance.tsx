import { useQuery } from '@tanstack/react-query'
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import type { ReactNode } from 'react'
import {
  useAtRisk,
  useAttendanceVsMarks,
  useClassPerformance,
  useMovers,
} from '@/api/performance/hooks'
import { SectionHeading } from '@/components/common/section-heading'
import { SegmentedControl } from '@/components/common/segmented-control'
import { Tag } from '@/components/common/tag'
import { EmptyState } from '@/components/feedback/empty-state'
import { Rule } from '@/components/page/rule'
import { TileStrip } from '@/components/page/tile-strip'
import { optionsQuery } from '@/features/collections/option-feeds'
import type { Option } from '@/features/collections/options'
import { cn } from '@/lib/utils'
import {
  classSubjectLines,
  figure,
  gradeLines,
  moverLines,
  studentPointLines,
  riskLines,
  signed,
} from '../performance'
import { DuplicateNotice, Footnote, PendingNotice, Section } from './section'

const VIEWS = ['subjects', 'movers', 'risk', 'attendance'] as const
type View = (typeof VIEWS)[number]

const VIEW_OPTIONS = [
  { value: 'subjects', label: 'Subjects' },
  { value: 'movers', label: 'Who moved' },
  { value: 'risk', label: 'Needs a look' },
  { value: 'attendance', label: 'Attendance vs marks' },
] as const satisfies readonly { value: View; label: string }[]

/**
 * How a class is doing, four ways, off the four class-wide `/performance`
 * reads.
 *
 * Tabbed rather than stacked because each view answers a different question
 * and takes a different set of filters — showing all four at once would fire
 * four requests for a page where somebody is reading one of them. The class
 * and the term stay put as the tabs change, so a head of department picks the
 * class once and then asks four questions of it.
 *
 * **Staff only, deliberately.** In a class of three, a class average is one
 * subtraction away from a named student's mark, which is why none of this is
 * offered to a guardian.
 */
export function ClassPerformance({
  classesFeed = 'classes',
  armsFeed = 'arms',
}: {
  /** `my-classes` for a teacher; the office's whole list for an admin. */
  classesFeed?: 'classes' | 'my-classes'
  armsFeed?: 'arms' | 'my-arms'
}) {
  const [state, setState] = useQueryStates({
    view: parseAsStringLiteral(VIEWS).withDefault('subjects'),
    class: parseAsString.withDefault(''),
    arm: parseAsString.withDefault(''),
    session: parseAsString.withDefault(''),
    term: parseAsString.withDefault(''),
    from: parseAsString.withDefault(''),
    to: parseAsString.withDefault(''),
  })

  const classes = useQuery(optionsQuery(classesFeed, ''))
  // An arm only means something inside a class, so this feed waits for one.
  const arms = useQuery(optionsQuery(armsFeed, state.class))
  const sessions = useQuery(optionsQuery('sessions', ''))
  const terms = useQuery(optionsQuery('terms', ''))

  // The page picks a class rather than sitting on "choose one": the first on
  // the register is a real answer, and what was chosen lives in the URL so the
  // view can be shared and survives a reload.
  const chosenClass = state.class || classes.data?.[0]?.value || ''
  const departmentId = Number(chosenClass) || undefined
  const scope = {
    department_id: departmentId,
    ...(state.arm ? { class_arm_id: Number(state.arm) } : {}),
    ...(state.session ? { session_id: Number(state.session) } : {}),
    ...(state.term ? { semester_id: Number(state.term) } : {}),
  }

  if (!classes.isPending && !(classes.data ?? []).length) {
    return (
      <EmptyState
        title="No class to report on"
        body={
          classesFeed === 'my-classes'
            ? 'You do not take a class this session, so there is nothing here to measure. The office assigns classes.'
            : 'The school has no classes on file yet. Add one under Classes & arms, and this page will have something to measure.'
        }
      />
    )
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3.5">
        <Picker
          label="Class"
          value={chosenClass}
          onChange={(value) => void setState({ class: value, arm: '' })}
          options={classes.data ?? []}
        />
        <Picker
          label="Arm"
          value={state.arm}
          onChange={(arm) => void setState({ arm })}
          options={arms.data ?? []}
          anyLabel="Every arm"
        />
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
      </div>

      <SegmentedControl<View>
        name="performance-view"
        className="mb-6"
        options={VIEW_OPTIONS}
        value={state.view}
        onChange={(view) => void setState({ view })}
      />

      {state.view === 'subjects' && <SubjectsView scope={scope} />}
      {state.view === 'movers' && (
        <MoversView
          departmentId={departmentId}
          terms={terms.data ?? []}
          sessionId={state.session ? Number(state.session) : undefined}
        />
      )}
      {state.view === 'risk' && <RiskView scope={scope} />}
      {state.view === 'attendance' && (
        <AttendanceView
          departmentId={departmentId}
          from={state.from}
          to={state.to}
          onRange={(next) => void setState(next)}
        />
      )}
    </div>
  )
}

type Scope = {
  department_id: number | undefined
  class_arm_id?: number
  session_id?: number
  semester_id?: number
}

/** Per subject: average, highest, lowest, spread, pass rate, grade breakdown. */
function SubjectsView({ scope }: { scope: Scope }) {
  const { data, isPending, error } = useClassPerformance(scope)
  const subjects = classSubjectLines(data?.subjects ?? [])
  const grades = gradeLines(data?.overall.grades)
  const overall = data?.overall

  return (
    <Section
      pending={isPending}
      error={error}
      note={data && !subjects.length ? data.message : null}
    >
      <TileStrip
        size="lg"
        tiles={[
          { label: 'Students counted', value: String(overall?.pupils ?? 0) },
          { label: 'Marks counted', value: String(overall?.marks_counted ?? 0) },
          { label: 'Class average', value: figure(overall?.average, '%') },
          {
            label: 'Pass rate',
            value: figure(overall?.pass_rate, '%'),
            delta: 'against the school pass mark',
            deltaTone: 'muted',
          },
        ]}
      />

      <PendingNotice count={data?.pending_excluded ?? 0} including={false} />
      <DuplicateNotice count={data?.duplicates.length ?? 0} />

      <Rule className="mt-8" />
      <SectionHeading>Subject by subject</SectionHeading>
      <div className="mt-4 overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <Th>Subject</Th>
              <Th align="right">Average</Th>
              <Th align="right">Highest</Th>
              <Th align="right">Lowest</Th>
              <Th align="right">Spread</Th>
              <Th align="right">Pass rate</Th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.key} className="border-b border-divider last:border-b-0">
                <td className="px-4 py-2.75 font-medium">{subject.name}</td>
                <td className="px-4 py-2.75 text-right tabular-nums">
                  {figure(subject.average)}
                </td>
                <td className="px-4 py-2.75 text-right tabular-nums">
                  {figure(subject.highest)}
                </td>
                <td className="px-4 py-2.75 text-right tabular-nums">
                  {figure(subject.lowest)}
                </td>
                <td className="px-4 py-2.75 text-right tabular-nums">
                  {figure(subject.spread)}
                </td>
                <td className="px-4 py-2.75 text-right tabular-nums">
                  {figure(subject.passRate, '%')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footnote>
        The spread is what separates two classes on the same average: everybody
        on 50 against a class split between 20 and 80. A wide spread with a
        respectable average usually means two groups in one room.
      </Footnote>

      {grades.length > 0 && (
        <>
          <Rule className="mt-8" />
          <SectionHeading>Grades across the class</SectionHeading>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {grades.map((grade) => (
              <div
                key={grade.key}
                className="animate-ems-up rounded-lg border border-divider bg-raised px-4 py-3 shadow-card"
              >
                <div className="text-2xs uppercase tracking-label text-muted-foreground">
                  {grade.name}
                </div>
                <div className="mt-1 font-heading text-xl font-extrabold tabular-nums">
                  {grade.count}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}

/**
 * Who changed between two terms — not who is top, which the report sheet
 * already says.
 *
 * Both terms have to be named, so this view asks for them rather than
 * defaulting: which two terms a school wants compared is a real question, and
 * guessing produces a confident answer to something nobody asked.
 */
function MoversView({
  departmentId,
  terms,
  sessionId,
}: {
  departmentId: number | undefined
  terms: Option[]
  sessionId: number | undefined
}) {
  const [range, setRange] = useQueryStates({
    fromTerm: parseAsString.withDefault(''),
    toTerm: parseAsString.withDefault(''),
  })

  const params = {
    department_id: departmentId,
    ...(sessionId ? { from_session_id: sessionId, to_session_id: sessionId } : {}),
    ...(range.fromTerm ? { from_semester_id: Number(range.fromTerm) } : {}),
    ...(range.toTerm ? { to_semester_id: Number(range.toTerm) } : {}),
  }
  const { data, isPending, error } = useMovers(params)
  const ready = Boolean(range.fromTerm && range.toTerm)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3.5">
        <Picker
          label="From term"
          value={range.fromTerm}
          onChange={(fromTerm) => void setRange({ fromTerm })}
          options={terms}
          anyLabel="Choose a term"
        />
        <Picker
          label="To term"
          value={range.toTerm}
          onChange={(toTerm) => void setRange({ toTerm })}
          options={terms}
          anyLabel="Choose a term"
        />
      </div>

      {!ready ? (
        <Footnote>
          Name the two terms to compare. A student with no mark in the earlier
          term is left out rather than reported as a fall from nothing.
        </Footnote>
      ) : (
        <Section
          pending={isPending}
          error={error}
          note={
            data && !data.risers.length && !data.fallers.length ? data.message : null
          }
        >
          <div className="grid gap-5 @3xl/page:grid-cols-2">
            <MoverColumn
              title="Went up"
              tone="good"
              rows={moverLines(data?.risers ?? [])}
              emptyLine="Nobody in this class improved between the two terms."
            />
            <MoverColumn
              title="Went down"
              tone="bad"
              rows={moverLines(data?.fallers ?? [])}
              emptyLine="Nobody in this class fell back between the two terms."
            />
          </div>
          <Footnote>
            A student with no mark in the earlier term is left out entirely, so
            somebody who has just joined the class never reads as a collapse.
          </Footnote>
        </Section>
      )}
    </div>
  )
}

function MoverColumn({
  title,
  tone,
  rows,
  emptyLine,
}: {
  title: string
  tone: 'good' | 'bad'
  rows: ReturnType<typeof moverLines>
  emptyLine: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-divider bg-raised shadow-card">
      <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3">
        <h4 className="flex-1 font-heading text-sm font-extrabold">{title}</h4>
        <Tag variant={tone}>{rows.length}</Tag>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyLine}
        </p>
      ) : (
        <ul className="divide-y divide-divider">
          {rows.map((row) => (
            <li key={row.key} className="flex items-baseline gap-3 px-4 py-2.75">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {row.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {figure(row.from)} &rarr; {figure(row.to)}
              </span>
              <span
                className={cn(
                  'w-14 text-right font-heading text-sm font-extrabold tabular-nums',
                  tone === 'good' ? 'text-success-ink' : 'text-danger-ink',
                )}
              >
                {signed(row.change)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The students the thresholds picked out.
 *
 * Every one of them is listed with the reasons the school gave and the
 * thresholds it used, because that is the only way a list like this is safe to
 * put in front of anybody: a teacher has to be able to disagree with it. The
 * endpoint sends its own sentence saying as much, and it is shown rather than
 * paraphrased.
 */
function RiskView({ scope }: { scope: Scope }) {
  const { data, isPending, error } = useAtRisk(scope)
  const students = riskLines(data?.pupils ?? [])

  return (
    <Section
      pending={isPending}
      error={error}
      note={data && !students.length ? data.message : null}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Tag variant="outline">
          Pass mark {data?.thresholds.pass_mark ?? '—'}
        </Tag>
        <Tag variant="outline">
          Attendance below {data?.thresholds.low_attendance ?? '—'}%
        </Tag>
        <span className="text-xs text-muted-foreground">
          {data?.considered ?? 0} student
          {(data?.considered ?? 0) === 1 ? '' : 's'} assessed
        </span>
      </div>

      <ul className="grid gap-3 @xl/page:grid-cols-2">
        {students.map((student) => (
          <li
            key={student.key}
            className="animate-ems-up rounded-xl border border-divider bg-raised px-4 py-3.5 shadow-card"
          >
            <div className="flex items-baseline gap-3">
              <div className="min-w-0 flex-1 truncate font-heading text-sm font-extrabold">
                {student.name}
              </div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {figure(student.average)} &middot; {figure(student.attendance, '%')}
              </div>
            </div>
            {student.reasons.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {student.reasons.map((reason) => (
                  <li key={reason}>
                    <Tag variant="bad">{reason}</Tag>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                The school gave no reason for this one, so there is nothing here
                to act on. Check the marks and the register yourself.
              </p>
            )}
          </li>
        ))}
      </ul>

      <Footnote>
        {data?.note ??
          'These are thresholds, not judgements. Every student listed comes with the figures that put them there so a teacher can disagree with it.'}
      </Footnote>
    </Section>
  )
}

/** Attendance beside marks, with a correlation only where one is honest. */
function AttendanceView({
  departmentId,
  from,
  to,
  onRange,
}: {
  departmentId: number | undefined
  from: string
  to: string
  onRange: (next: { from?: string; to?: string }) => void
}) {
  const { data, isPending, error } = useAttendanceVsMarks({
    department_id: departmentId,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  })
  const students = studentPointLines(data?.pupils ?? [])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3.5">
        <DateBox label="From" value={from} onChange={(value) => onRange({ from: value })} />
        <DateBox label="To" value={to} onChange={(value) => onRange({ to: value })} />
      </div>

      <Section
        pending={isPending}
        error={error}
        note={data && !students.length ? data.message : null}
      >
        <div className="rounded-xl border border-divider bg-raised px-4.5 py-4 shadow-card">
          <div className="text-2xs uppercase tracking-label text-muted-foreground">
            Correlation
          </div>
          <div className="mt-1 font-heading text-stat font-extrabold tabular-nums">
            {data?.correlation === null || data?.correlation === undefined
              ? '—'
              : data.correlation.toFixed(2)}
          </div>
          <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">
            {data?.correlation_reading ??
              data?.message ??
              'A coefficient is only reported once at least five students have both an average and a marked register.'}
          </p>
        </div>

        <Rule className="mt-8" />
        <SectionHeading>Student by student</SectionHeading>
        <div className="mt-4 overflow-x-auto rounded-xl border border-divider bg-raised shadow-card">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-divider text-left">
                <Th>Student</Th>
                <Th align="right">Attendance</Th>
                <Th align="right">Average</Th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.key} className="border-b border-divider last:border-b-0">
                  <td className="px-4 py-2.75 font-medium">{student.name}</td>
                  <td className="px-4 py-2.75 text-right tabular-nums">
                    {figure(student.attendance, '%')}
                  </td>
                  <td className="px-4 py-2.75 text-right tabular-nums">
                    {figure(student.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Footnote>
          A correlation is not a cause. A class where the students who attend also
          score well may be a class where the same few children are ill, moving
          house, or being kept back to trade &mdash; which is a conversation, not
          a figure.
        </Footnote>
      </Section>
    </div>
  )
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
  options: Option[]
  /** Omitted where the filter is required, so there is no empty answer to pick. */
  anyLabel?: string
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
        {anyLabel && <option value="">{anyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function DateBox({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <div className="mb-1.25 text-xs text-foreground/70">{label}</div>
      <input
        type="date"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  )
}
