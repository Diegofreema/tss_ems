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
import { SegmentedControl } from '@/components/common/segmented-control'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useMarkingTerm } from '../term/use-marking-term'
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
  /*
   * Read before the early returns below, because a hook cannot be called after
   * one. It reads the marks straight off the live query rather than the
   * narrowed `held` further down — the term is the same whichever sheet is
   * open, and this way it is asked for once for the page.
   */
  const { term, looking } = useMarkingTerm((marks.data ?? []) as TeacherResult[])

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
          // Without a session and a term the endpoint has nothing to file
          // against, and a teaching login cannot read the school calendar.
          // The term is read off this teacher's own marks first and off the
          // school's results register second; only when both say nothing —
          // a school that has filed no marks at all — is the sheet unsaveable.
          <>
            {looking
              ? 'Checking which term the school is filing into\u2026'
              : 'Marks cannot be filed yet: this portal reads the term off the marks on file, and the school has none. Ask the office to file the first mark of the term, or to open the calendar to teaching logins.'}
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
  return (
    <div className="min-w-50">
      <div className="mb-1.5 text-2xs uppercase tracking-label text-muted-foreground">
        {label}
      </div>
      <SegmentedControl name={name} value={value} onChange={onChange} options={options} />
    </div>
  )
}
