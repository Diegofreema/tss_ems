import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { useEnterScores } from '@/api/teaching/hooks'
import { useMySubjects, useMyResults, useMyStudents } from '@/api/teaching/hooks'
import { SegmentedControl } from '@/components/common/segmented-control'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { termFromResults } from '../term/term'
import { sheetAverage } from './grade'
import { ScoreSheet } from './score-sheet'
import { changedMarks, type Edits, editKey, sheetRows } from './sheet'

/** A teacher's whole roll and mark sheet, both of which page at the endpoint. */
const ALL = 500

export function ScoresPage() {
  const subjects = useMySubjects()
  const roll = useMyStudents({ limit: ALL })
  const marks = useMyResults({ limit: ALL })
  const save = useEnterScores()
  const [edits, setEdits] = useState<Edits>({})
  const [chosenSubject, setSubject] = useQueryState('subject')
  const [chosenArm, setArm] = useQueryState('arm')

  if (subjects.isPending || roll.isPending || marks.isPending) {
    return (
      <>
        <Header />
        <TableSkeleton rows={6} />
      </>
    )
  }

  const mine = subjects.data ?? []
  const arms = roll.data?.class_arms ?? []
  const pupils = roll.data?.items ?? []
  const held = marks.data?.items ?? []

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
    pupils.filter((pupil) => pupil.class_arm_id === arm.id),
    held,
    subject.id,
    edits,
  )
  const term = termFromResults(held)
  const pending = rows.filter((row) => row.edited)
  const problems = rows.filter((row) => row.problem)

  const setMark = (studentId: number, field: 'ca' | 'exam', value: string) =>
    setEdits((previous) => {
      const key = editKey(subject.id, studentId)
      return { ...previous, [key]: { ...previous[key], [field]: value } }
    })

  const submit = async () => {
    if (!term) return
    await save
      .mutateAsync(changedMarks(rows, subject.id, term))
      // A refusal has already been announced by the mutation cache. What was
      // taken before it stays taken, and the sheet is re-read either way.
      .catch(() => undefined)
    setEdits({})
  }

  return (
    <>
      <Header
        action={
          <Button
            pending={save.isPending}
            disabled={!term || pending.length === 0 || problems.length > 0}
            onClick={submit}
          >
            {pending.length
              ? `Save ${pending.length} mark${pending.length === 1 ? '' : 's'}`
              : 'Save marks'}
          </Button>
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
          <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
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
          title="No pupils in this arm"
          body="The office places pupils in arms. Once one is placed here, they appear on this sheet."
        />
      )}

      <div className="mt-3.5 text-xs text-muted-foreground">
        {term ? (
          <>
            {rows.length} pupils · {subject.name} · {arm.arm_name} · filed into{' '}
            {term.label}
            {problems.length > 0 && ' · fix the flagged marks before saving'}
          </>
        ) : (
          // Without a session and a term the endpoint has nothing to file
          // against, and a teaching login cannot read the school calendar.
          <>
            Marks cannot be filed yet: this portal reads the term off your own
            marks, and you have none. Ask the school office to record your first
            mark of the term, or to open the calendar to teaching logins.
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
    <div className="min-w-[200px]">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </div>
      <SegmentedControl name={name} value={value} onChange={onChange} options={options} />
    </div>
  )
}
