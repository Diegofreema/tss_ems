import { Link } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { ChevronLeft } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useRef } from 'react'
import { collectionError } from '@/db/collection'
import {
  setAssignments,
  setQuestions,
  setScripts,
  setSubmissions,
} from '@/db/collections/set-assignments'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { useHeld } from '@/db/live'
import type { OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { MarkingSheet, type MarkingValues } from './marking-sheet'
import {
  autoGradable,
  gradeBody,
  needsTeacher,
  openingScores,
  submissionRows,
} from './marking'
import { gradedCounters, queuedGrades, withQueuedGrades, withQueuedScores } from './queued'
import { SubmissionList } from './submission-list'

/**
 * Marking an assignment: what the students sent back, and then one of them.
 *
 * Both are in the URL rather than in the route — `?assignment` for what came
 * back and `?submission` for one of them — so a teacher stopped halfway can be
 * sent back to exactly the script they were reading, and closing a marked
 * submission returns them to the list rather than out of the flow.
 *
 * The scripts come off the device's own sets and the marks go through the
 * queue, so a class's papers marked in a staffroom with no signal are kept
 * and sent when the signal comes back. What the queue holds is written over
 * the list and the sheet by the pure composers in `queued.ts`.
 */
export function SubmissionsPage() {
  const [assignmentId] = useQueryState('assignment', parseAsString.withDefault(''))
  const [submissionId, setSubmission] = useQueryState(
    'submission',
    parseAsString.withDefault(''),
  )

  const assignments = useHeld(setAssignments)
  const submissions = useHeld(setSubmissions)
  const scripts = useHeld(setScripts)
  const questions = useHeld(setQuestions)
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })
  const ops = (queue.data ?? []) as OutboxOp[]

  /*
   * Papers the answer key settles are filed here, without anybody pressing
   * anything.
   *
   * The school scores nothing itself, so a paper of nothing but multiple
   * choice used to wait on a teacher opening each script and pressing Save on
   * a sheet where every figure was already right and none of them editable.
   * The student waited on that click for their result. Filing it is not this
   * app deciding anything: the marks are the assignment's own answer key,
   * worked out by the same function the sheet would have shown and sent by the
   * same handler the button would have used.
   *
   * On this page rather than anywhere else because this is where the scripts
   * are — the body is keyed on `answer_id`, and the answers arrive with the
   * route's own `freshen`. A paper nobody ever opens Marking for is still not
   * filed, which is the one gap left and is written down rather than hidden.
   */
  const filed = useRef(new Set<string>())
  const paperNeedsAPerson = needsTeacher(
    questions.rows.filter((question) => String(question.assignment_id) === assignmentId),
  )
  const doc = submissions.rows.find((one) => String(one.id) === assignmentId)

  useEffect(() => {
    if (!assignmentId || paperNeedsAPerson) return
    const wanted = autoGradable(
      doc?.submissions ?? [],
      scripts.rows,
      paperNeedsAPerson,
      filed.current,
    )
    for (const one of wanted) {
      // Written down before the send, not after: the outbox takes a moment to
      // show the op, and a re-render in between would queue the same marks
      // again.
      filed.current.add(one.id)
      void enqueue({
        handler: WRITE.gradeSubmission,
        payload: {
          submission_id: one.id,
          body: gradeBody({
            answers: one.answers,
            scores: openingScores(one.answers),
            comment: '',
            // Never a regrade: `autoGradable` only ever hands back submissions
            // the school still calls ungraded.
            marked: false,
          }),
        },
        collectionId: SET.teachingScripts,
        // Silent. This is the app catching up with arithmetic nobody disputed,
        // and a teacher opening Marking on a class of thirty does not want
        // thirty sentences about it. A failure still speaks for itself.
        toast: { success: 'Marked from the answer key', silent: true },
        label: `Marks for submission ${one.id}, from the answer key`,
      })
    }
  }, [assignmentId, paperNeedsAPerson, doc, scripts.rows])

  if (!assignmentId) {
    return (
      <>
        <Header title="Marking" />
        <EmptyState
          title="No assignment chosen"
          body="Choose an assignment and this is where the answers your students sent back are marked."
          action={
            <Button asChild>
              <Link to="/teacher/assignments">Choose an assignment</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (assignments.pending || submissions.pending) {
    return (
      <>
        <Header title="Marking" />
        <TableSkeleton rows={4} />
      </>
    )
  }

  if (submissions.failed) {
    return (
      <>
        <Header title="Marking" />
        <EmptyState
          title="The submissions could not be read"
          body={errorMessage(collectionError(SET.teachingSubmissions), OFFLINE_MESSAGE)}
        />
      </>
    )
  }

  const record = assignments.rows.find((assignment) => String(assignment.id) === assignmentId)
  const title = record?.title?.trim() || 'Marking'
  const where = [record?.subject, record?.class, record?.semester]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')

  if (submissionId) {
    if (scripts.pending) {
      return (
        <>
          <Header title={title} description={where} />
          <TableSkeleton rows={4} />
        </>
      )
    }

    const script = scripts.rows.find((one) => String(one.id) === submissionId)
    // The marks this device has already queued for this script, written back
    // in — the sheet reopens on what the teacher gave, and reads as marked,
    // which by this device's account it is.
    const submission = script
      ? withQueuedScores(script, queuedGrades(ops).get(submissionId))
      : undefined
    const answers = submission?.answers ?? []
    // `graded_at` is the marking view's own answer to "has anybody marked it";
    // the list beside it says `graded`, and neither is on the other.
    const head = submission?.submission
    const marked = Boolean(head?.graded_at) || head?.total_score != null
    const student = head?.student?.trim() || 'This student'

    const save = async (values: MarkingValues) => {
      // Sent to the school, and kept on the device if it could not be. `regrade`
      // is right either way: a second grade queued behind a first is a regrade
      // by the time it sends, since the queue lands strictly in order.
      const outcome = await enqueue({
        handler: WRITE.gradeSubmission,
        payload: {
          submission_id: submissionId,
          body: gradeBody({ answers, scores: values.scores, comment: values.comment, marked }),
        },
        collectionId: SET.teachingScripts,
        toast: { success: 'Marks saved' },
        label: `Marks for ${student}`,
      })
      // The script stays open where the school refused the marks, so they are
      // not retyped from the paper.
      if (outcome === 'refused') return
      void setSubmission(null)
    }

    return (
      <>
        <Button
          variant="ghost"
          className="mb-3.5 px-1 text-brand"
          onClick={() => void setSubmission(null)}
        >
          <ChevronLeft className="size-3.5" strokeWidth={2} />
          Back to the submissions
        </Button>
        <Header
          title={student}
          description={[title, where].filter(Boolean).join(' · ')}
        />
        <Rule />

        {submission ? (
          <MarkingSheet
            submission={submission}
            marked={marked}
            pending={false}
            onSave={save}
          />
        ) : scripts.failed ? (
          <EmptyState
            title="That script could not be read"
            body={errorMessage(collectionError(SET.teachingScripts), OFFLINE_MESSAGE)}
          />
        ) : (
          <EmptyState
            title="That submission did not come back"
            body="It may have been deleted with the assignment it belongs to. The submissions that are still there are on the page behind this one."
          />
        )}
      </>
    )
  }

  const listed = doc?.submissions ?? []
  const school = submissionRows(listed, paperNeedsAPerson)
  // The counters are moved against the school's own rows, before the overlay
  // writes "Marked" over them — after it, a queued mark would count as
  // nothing new.
  const counters = gradedCounters(
    {
      sat: doc?.sat ?? listed.length,
      marked: doc?.marked ?? 0,
      waiting: doc?.waiting ?? 0,
    },
    school,
    ops,
  )
  const rows = withQueuedGrades(school, ops)

  return (
    <>
      <Header
        title={title}
        description={where}
        action={
          <Button asChild variant="outline">
            <Link to="/teacher/questions" search={{ assignment: assignmentId }}>
              The questions
            </Link>
          </Button>
        }
      />
      <Rule />

      <SubmissionList
        rows={rows}
        sat={counters.sat}
        marked={counters.marked}
        waiting={counters.waiting}
        onOpen={(id) => void setSubmission(id)}
      />
    </>
  )
}

function Header({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <PageHeader
      kicker="Assessment · Marking"
      title={title}
      description={
        description ||
        'What your students submitted, for you to mark. The multiple choice is marked from the answer key; the written answers, and the note beside the mark, are yours.'
      }
      action={action}
    />
  )
}
