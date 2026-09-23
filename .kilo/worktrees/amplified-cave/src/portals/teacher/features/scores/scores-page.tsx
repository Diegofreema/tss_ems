import { useLiveQuery } from '@tanstack/react-db'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import type {
  TeacherClassArm,
  TeacherResult,
  TeacherStudent,
  TeacherSubject,
} from '@/api/teaching/types'
import {
  teacherArms,
  teacherMarks,
  teacherRoll,
  teacherSubjects,
} from '@/db/collections/teaching'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import type { OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { refSessions, refTerms } from '@/db/collections/reference'
import { useHeld } from '@/db/live'
import { useMarkingTerm } from '../term/use-marking-term'
import { chosenTerm } from '../term/term'
import { blockedReason } from './blocked'
import { sheetAverage } from './grade'
import { queuedScores } from './queued'
import { ScoreSheet } from './score-sheet'
import { changedMarks, type Edits, editKey, sheetRows } from './sheet'

/** A set has answered one way or the other and the page can draw. */
const settled = (state: { isReady: boolean; isError: boolean }) =>
  state.isReady || state.isError

/**
 * The mark sheet, read off the device and written to the queue.
 *
 * Four sets the teacher portal has already synced, plus whatever this device is
 * still holding for the school. Nothing here is a request: a paused query never
 * settles, and a teacher with a sheet of marks and no signal would be looking
 * at a skeleton.
 */
export function ScoresPage() {
  const subjects = useLiveQuery({ query: (q) => q.from({ subject: teacherSubjects }) })
  const roll = useLiveQuery({ query: (q) => q.from({ student: teacherRoll }) })
  const myArms = useLiveQuery({ query: (q) => q.from({ arm: teacherArms }) })
  const marks = useLiveQuery({ query: (q) => q.from({ mark: teacherMarks }) })
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })
  const [edits, setEdits] = useState<Edits>({})
  const [chosenSubject, setSubject] = useQueryState('subject')
  const [chosenArm, setArm] = useQueryState('arm')
  const [pickedTerm, setTerm] = useQueryState('term')
  const [pickedSession, setSession] = useQueryState('session')
  /*
   * The school's own calendar, where a teaching login may read it. Empty
   * while `/sessions` and `/semesters` refuse one, which is what the pickers
   * below check before drawing themselves.
   */
  const schoolSessions = useHeld(refSessions)
  const schoolTerms = useHeld(refTerms)
  /*
   * Read before the early returns below, because a hook cannot be called after
   * one. It reads the marks straight off the live query rather than the
   * narrowed `held` further down — the term is the same whichever sheet is
   * open, and this way it is asked for once for the page.
   */
  const { term: filedInto, looking } = useMarkingTerm((marks.data ?? []) as TeacherResult[])

  if (![subjects, roll, myArms, marks].every(settled)) {
    return (
      <>
        <Header />
        <TableSkeleton rows={6} />
      </>
    )
  }

  const mine = (subjects.data ?? []) as TeacherSubject[]
  const arms = (myArms.data ?? []) as TeacherClassArm[]
  const students = (roll.data ?? []) as TeacherStudent[]
  const held = (marks.data ?? []) as TeacherResult[]
  const waiting = queuedScores((queue.data ?? []) as OutboxOp[])

  if (!mine.length || !arms.length) {
    return (
      <>
        <Header />
        <EmptyState
          title="Nothing to mark yet"
          body={
            mine.length
              ? 'You are not class teacher of an arm this session, so there is no roll to mark.'
              : 'The school office has not given you a subject yet. Marks are entered against a subject you teach.'
          }
        />
      </>
    )
  }

  // The first of each is the sheet a teacher lands on; the URL holds whichever
  // they picked, so a sheet is shareable and survives a reload.
  const subjectId = Number(chosenSubject) || mine[0].id
  const armId = Number(chosenArm) || arms[0].id
  /*
   * Which term these marks are filed into, chosen rather than only inferred.
   *
   * `POST /results` takes `session_id` and `semester_id`, and the two always
   * travel together — a mark belongs to one term of one session, never to a
   * term of one and a session of another. So they are picked as a pair, which
   * is also the only shape the school ever hands a teacher: the two ids with
   * their names beside them, on a mark.
   *
   * A chosen term that is not among the ones on offer falls back to the
   * default rather than being trusted — a URL can say anything, and a mark
   * filed into a session nobody has heard of is worse than one filed into the
   * current term.
   */
  /*
   * Newest session first — a teacher filing marks is filing this year's, and
   * the order has to be stated rather than taken from the endpoint, since a
   * collection hands its rows back in key order. Terms keep their own order,
   * which is the order a school year runs in.
   */
  const sessionList = [...schoolSessions.rows].sort((one, two) => two.id - one.id)
  const termList = [...schoolTerms.rows].sort((one, two) => one.id - two.id)

  const term = chosenTerm(
    sessionList,
    termList,
    { session: pickedSession, term: pickedTerm },
    filedInto,
  )
  const subject = mine.find((one) => one.id === subjectId) ?? mine[0]
  const arm = arms.find((one) => one.id === armId) ?? arms[0]

  const rows = sheetRows(
    students.filter((student) => student.class_arm_id === arm.id),
    held,
    subject.id,
    edits,
    waiting,
  )
  const pending = rows.filter((row) => row.edited)
  const problems = rows.filter((row) => row.problem)

  // Why the button will not go, in one sentence. See `blockedReason`.
  const blocked = blockedReason({
    problems: problems.length,
    pending: pending.length,
    hasTerm: Boolean(term),
    looking,
  })

  const setMark = (studentId: number, field: 'ca' | 'exam', value: string) =>
    setEdits((previous) => {
      const key = editKey(subject.id, studentId)
      return { ...previous, [key]: { ...previous[key], [field]: value } }
    })

  /**
   * Written down on the device, one op per mark, and sent when there is
   * somewhere to send them.
   *
   * One op per mark rather than one for the sheet, which is strictly better
   * than the loop this replaces: that one sent them in turn and stopped at the
   * first refusal, stranding every row after it. As ordered ops, a mark the
   * school argues with fails on its own and the rest still land.
   *
   * The edits are cleared straight away — not thrown away, moved somewhere
   * durable. The sheet reads the queue as well as the school, so the marks stay
   * exactly where they were on screen.
   */
  const submit = async () => {
    if (!term) return
    /*
     * One at a time, awaited. Each mark is its own write, and firing a sheet
     * of thirty at the school at once would both swamp it and defeat the
     * fallback: the second mark only knows to join the queue because the first
     * one is already in it, and it cannot know that while both are in flight.
     */
    let refused = false
    for (const mark of changedMarks(rows, subject.id, term)) {
      const outcome = await enqueue({
        handler: WRITE.enterScore,
        payload: mark,
        collectionId: SET.teachingResults,
        toast: { success: 'Scores saved' },
        label: `${subject.name} mark for ${
          rows.find((row) => row.student_id === mark.student_id)?.name ?? 'a student'
        }`,
      })
      if (outcome === 'refused') refused = true
    }
    // The same rule as the register: marks the school would not take stay on
    // the sheet, where whoever entered them can see which and try again.
    if (refused) return
    setEdits({})
  }

  return (
    <>
      <Header
        action={
          <div className="text-right">
            <Button
              disabled={!term || pending.length === 0 || problems.length > 0}
              pending={looking && pending.length > 0}
              onClick={submit}
            >
              {pending.length
                ? `Save ${pending.length} mark${pending.length === 1 ? '' : 's'}`
                : 'Save marks'}
            </Button>
            {/* Why the button will not go, beside the button. The same reasons
                are spelled out under the sheet, which is a long way from the
                thing being clicked — a teacher who has typed a sheet of marks
                and cannot save them should not have to go looking. */}
            {blocked && (
              <p className="mt-1.5 max-w-64 text-2xs leading-relaxed text-muted-foreground">
                {blocked}
              </p>
            )}
          </div>
        }
      />
      <Rule />

      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <Picker
          name="subject"
          label="Subject"
          value={String(subject.id)}
          options={mine.map((one) => ({ value: String(one.id), label: one.name }))}
          onChange={(value) => void setSubject(value)}
        />
        <Picker
          name="arm"
          label="Arm"
          value={String(arm.id)}
          options={arms.map((one) => ({ value: String(one.id), label: one.arm_name }))}
          onChange={(value) => void setArm(value)}
        />
        {/*
          Which term these marks are filed into, chosen rather than inferred.
          `POST /results` takes both ids and they always travel together — a
          mark belongs to one term of one session — so both are picked.

          Both are drawn whether or not the school has given this login a list.
          They were hidden while empty, and hiding them was worse: a teacher
          could see no way to say which term they were marking, and nothing on
          the page admitted that the choice existed at all. Empty, they say so
          and cannot be opened — which is a fault somebody can report, rather
          than a feature nobody knows is missing.
        */}
        <Picker
          name="session"
          label="Session"
          value={term ? String(term.session_id) : ''}
          options={sessionList.map((one) => ({ value: String(one.id), label: one.name }))}
          onChange={(value) => void setSession(value)}
        />
        <Picker
          name="term"
          label="Term"
          value={term ? String(term.semester_id) : ''}
          options={termList.map((one) => ({ value: String(one.id), label: one.name }))}
          onChange={(value) => void setTerm(value)}
        />
        <div className="flex-1" />
        <div className="text-right">
          <div className="text-2xs uppercase tracking-label text-muted-foreground">
            Sheet average
          </div>
          <div className="font-heading text-2xl font-extrabold tabular-nums">
            {sheetAverage(rows.map((row) => row.total))}
          </div>
        </div>
      </div>

      {rows.length ? (
        <ScoreSheet rows={rows} onMarkChange={setMark} />
      ) : (
        <EmptyState
          title="No students in this arm"
          body="The office places students in arms. Once one is placed here, they appear on this sheet."
        />
      )}

      <div className="mt-3.5 text-xs text-muted-foreground">
        {term ? (
          <>
            {rows.length} students · {subject.name} · {arm.arm_name} · filed into{' '}
            {term.label}
            {problems.length > 0 && ' · fix the flagged marks before saving'}
          </>
        ) : (
          /*
           * Without a session and a term the endpoint has nothing to file
           * against. Three things can name one — the pickers above, this
           * teacher's own marks, and the school's results register — and this
           * sentence is what is left when all three say nothing: a login that
           * may not read the calendar, in a school that has filed no mark at
           * all. It names the way out rather than the mechanism.
           */
          <>
            {looking
              ? 'Checking which term the school is filing into\u2026'
              : 'Marks cannot be filed yet: nothing has told this portal which term the school is in. Ask the office to open the calendar to teaching logins, or to file the first mark of the term.'}
          </>
        )}
      </div>
    </>
  )
}

function Header({ action }: { action?: React.ReactNode }) {
  return (
    <PageHeader
      kicker="Assessment"
      title="Enter scores"
      description="One arm and one subject at a time. Totals compute as you type; nothing is filed until you save, and the school works out the grade."
      action={action}
    />
  )
}

/**
 * One of the four choices above the sheet: subject, arm, session, term.
 *
 * A select rather than a segmented control, which is what these were. The
 * control is right for two or three fixed options and wrong for these: a
 * teacher on this school carries five subjects and the school runs six
 * classes, so each strip grew with the data until four of them wrapped across
 * the top of the page and pushed the sheet itself under the fold. A select is
 * the same height whether it holds three terms or thirty subjects, and it is
 * what the rest of the app already uses to choose one of many.
 */
function Picker({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  /*
   * A picker the school has given nothing to fill: it says so and cannot be
   * opened. Disabled rather than openable onto an empty menu, which reads as
   * a list that has not loaded yet and invites a second click.
   *
   * `undefined` rather than an empty string for the value — the select treats
   * an empty value as no value and shows the placeholder, which is exactly
   * what is wanted, but it refuses to hold `''` as a chosen one.
   */
  const empty = options.length === 0

  return (
    <div className="min-w-44">
      <label
        htmlFor={`pick-${name}`}
        className="mb-1.5 block text-2xs uppercase tracking-label text-muted-foreground"
      >
        {label}
      </label>
      <Select value={value || undefined} onValueChange={onChange} disabled={empty}>
        {/* Named by its own label rather than by the value, so a screen reader
            hears "Subject" and not the subject it happens to be set to. */}
        <SelectTrigger id={`pick-${name}`} aria-label={label} className="w-full">
          <SelectValue placeholder={empty ? 'No data' : label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
