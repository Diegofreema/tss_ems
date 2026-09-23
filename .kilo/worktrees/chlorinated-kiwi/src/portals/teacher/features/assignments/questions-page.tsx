import { Link } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { Check, Plus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import type { AssignmentQuestion } from '@/api/set-assignments/types'
import { collectionError } from '@/db/collection'
import { setAssignments, setQuestions } from '@/db/collections/set-assignments'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { useHeld } from '@/db/live'
import { newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/hooks/use-confirm'
import { QuestionCard } from './question-card'
import { QuestionForm } from './question-form'
import { composeQuestions, type PageQuestion, withFreshQuestions } from './queued'
import {
  blankQuestion,
  questionBody,
  questionReview,
  type QuestionReview,
  questionValues,
  type QuestionValues,
  totalMarks,
} from './question'

/**
 * Writing the questions of one assignment.
 *
 * Which assignment is in the URL rather than in the route, so the list can hand
 * one over and a teacher can keep the link. It is its own page and not a tab
 * of the assignment's record because a question is not a row of a record form: it
 * carries its own choices and its own answer key, and both are edited here.
 *
 * The questions come off the device's own set and every write goes through
 * the queue, so a paper can be written in full with no connection — the
 * afternoon this flow exists for. What the queue holds is composed onto the
 * school's rows by `composeQuestions`, which is pure and tested.
 */
export function QuestionsPage() {
  const [assignmentId] = useQueryState('assignment', parseAsString.withDefault(''))
  const assignments = useHeld(setAssignments)
  const held = useHeld(setQuestions)
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })
  const confirm = useConfirm()

  /** Nothing open, the new question, or the key of the one being rewritten. */
  const [editing, setEditing] = useState<'new' | string | null>(null)
  /**
   * Questions the school has taken in this sitting, held only until the set
   * has been fetched again — see `withFreshQuestions`. Without it a teacher
   * with a good connection writes a question and watches an unchanged page
   * while a dozen refetches run, which is the one moment they most want to see
   * that it worked.
   */
  const [fresh, setFresh] = useState<AssignmentQuestion[]>([])

  if (!assignmentId) {
    return (
      <>
        <Header title="Write the questions" />
        <EmptyState
          title="No assignment chosen"
          body="Choose an assignment and this is where its questions are written."
          action={
            <Button asChild>
              <Link to="/teacher/assignments">Choose an assignment</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (assignments.pending || held.pending) {
    return (
      <>
        <Header title="Write the questions" />
        <TableSkeleton rows={4} />
      </>
    )
  }

  if (held.failed) {
    return (
      <>
        <Header title="Write the questions" />
        <EmptyState
          title="The questions could not be read"
          body={errorMessage(collectionError(SET.teachingQuestions), OFFLINE_MESSAGE)}
        />
      </>
    )
  }

  const record = assignments.rows.find((assignment) => String(assignment.id) === assignmentId)
  const ops = (queue.data ?? []) as OutboxOp[]
  const written = held.rows
    .filter((question) => String(question.assignment_id) === assignmentId)
    .sort((a, b) => (a.order_number ?? a.id) - (b.order_number ?? b.id))
  const composed = composeQuestions(withFreshQuestions(written, fresh), ops, assignmentId)
  const marks = totalMarks(composed.map((one) => one.question))

  const paper = record?.title?.trim() || `assignment ${assignmentId}`

  const write = async (values: QuestionValues) => {
    const body = questionBody(values)
    if (editing === 'new') {
      const outcome = await enqueue({
        handler: WRITE.addQuestion,
        payload: { assignment_id: assignmentId, body },
        collectionId: SET.teachingQuestions,
        targetKey: newLocalKey(),
        toast: { success: 'Question added' },
        label: `A question for “${paper}”`,
        // The question as the school filed it, drawn until the set catches up.
        // Read defensively on purpose: a shape this does not recognise costs
        // the head start and nothing else, and the page falls back to waiting
        // for the refetch exactly as it did before.
        onSent: (answer) => {
          const filed = answer as AssignmentQuestion | null
          if (filed && typeof filed.id === 'number') setFresh((held) => [...held, filed])
        },
      })
      // Refused: the editor stays open on the question as it was typed.
      if (outcome === 'refused') return
    } else {
      const outcome = await enqueue({
        handler: WRITE.updateQuestion,
        payload: { assignment_id: assignmentId, question_id: editing, body },
        collectionId: SET.teachingQuestions,
        toast: { success: 'Question saved' },
        label: `A question of “${paper}”`,
      })
      if (outcome === 'refused') return
    }
    setEditing(null)
  }

  /**
   * Nothing goes on the paper until the teacher has read it back.
   *
   * A question is not an edit to a row somebody can correct in a second: once
   * it is on the paper a class can sit it, and a wrong answer key marks every
   * one of them wrong without anybody being told. The dialog shows what is
   * about to be *sent* rather than what is in the form — see `questionReview`
   * — and holds itself open with the button spinning until the school answers,
   * which is also what stops the same question being filed twice by somebody
   * who thought the first click had missed.
   */
  const save = (values: QuestionValues) => {
    const adding = editing === 'new'
    confirm.ask({
      title: adding ? 'Add this question?' : 'Save this change?',
      body: adding
        ? `Read it back before it goes on “${paper}”. Once it is on the paper your class can sit it.`
        : `This replaces the question on “${paper}”. A student who has already sat the assignment keeps the answer they gave.`,
      subject: <ReviewBlock review={questionReview(values)} />,
      cta: adding ? 'Add the question' : 'Save the question',
      cancel: 'Go back and edit',
      // Nothing is being taken away, so the dialog asks rather than warns.
      tone: 'brand',
      // Returned, not fired: the dialog holds open on this promise and its
      // button spins for as long as the school takes to answer.
      onConfirm: () => write(values),
    })
  }

  const askDelete = (entry: PageQuestion) =>
    confirm.ask({
      title: 'Delete this question?',
      body: 'It goes from the assignment, and the assignment is worth that much less. A student who has already sat the assignment keeps the answer they gave.',
      subject: entry.question.question_text?.trim() || `Question ${entry.key}`,
      cta: 'Delete the question',
      cancel: 'Keep it',
      onConfirm: () => {
        enqueue({
          handler: WRITE.removeQuestion,
          payload: { assignment_id: assignmentId, question_id: entry.key },
          collectionId: SET.teachingQuestions,
          toast: { success: 'Question deleted' },
          label: 'A question',
        })
      },
    })

  const opened = composed.find((entry) => entry.key === editing)

  return (
    <>
      <Header
        title={record?.title?.trim() || 'Write the questions'}
        description={[record?.subject, record?.class, record?.semester]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' · ')}
        action={
          editing === null && (
            <div className="flex gap-2.5">
              <Button asChild variant="outline">
                <Link to="/teacher/submissions" search={{ assignment: assignmentId }}>
                  Marking
                </Link>
              </Button>
              <Button onClick={() => setEditing('new')}>
                <Plus /> Add a question
              </Button>
            </div>
          )
        }
      />
      <Rule />

      {editing !== null && (
        <QuestionForm
          // Remounted per question, so the form opens on the one being edited
          // rather than on whatever was open before it.
          key={String(editing)}
          values={opened ? questionValues(opened.question) : blankQuestion()}
          submitLabel={editing === 'new' ? 'Add the question' : 'Save the question'}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {composed.length ? (
        <ul className="grid gap-2.5">
          {composed.map((entry, index) => (
            <QuestionCard
              key={entry.key}
              question={entry.question}
              position={entry.question.order_number ?? index + 1}
              // A question still queued has no id the school knows; editing it
              // waits for one, the same one rule every unsynced row follows.
              onEdit={entry.waiting ? undefined : () => setEditing(entry.key)}
              onDelete={entry.waiting ? undefined : () => askDelete(entry)}
              waiting={entry.waiting}
            />
          ))}
        </ul>
      ) : (
        editing === null && (
          <EmptyState
            title="No questions yet"
            body="An assignment with no questions cannot be sat, however open its window is. Write the first one and the class can answer it."
            action={<Button onClick={() => setEditing('new')}>Add a question</Button>}
          />
        )
      )}

      <div className="mt-3.5 text-xs text-muted-foreground">
        {composed.length} question{composed.length === 1 ? '' : 's'} · {marks} mark
        {marks === 1 ? '' : 's'} in total
        {record?.passing_score != null && ` · pass at ${record.passing_score}%`}
        {record?.time_limit ? ` · ${record.time_limit} minutes allowed` : ''}
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </>
  )
}

/**
 * The question as the school is about to receive it.
 *
 * Every part a teacher could have got wrong and cannot see from the form at a
 * glance: the wording as it will be stored, which of the two kinds it is, what
 * it is worth, and — the one that matters most — which choice is ticked as the
 * answer. A blank choice is already gone by here, because this is drawn from
 * the payload rather than from the boxes.
 */
function ReviewBlock({ review }: { review: QuestionReview }) {
  return (
    <div className="grid gap-3">
      <p className="whitespace-pre-wrap text-foreground">{review.question}</p>

      <div className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
        <span className="rounded-sm bg-raised px-1.5 py-0.5 font-medium text-foreground">
          {review.kind}
        </span>
        <span className="tabular-nums">
          {review.points} point{review.points === 1 ? '' : 's'}
        </span>
      </div>

      {review.choices.length > 0 && (
        <ul className="grid gap-1">
          {review.choices.map((choice, index) => (
            <li
              key={`${index}-${choice.text}`}
              className={cn(
                'flex items-start gap-1.5 text-xs',
                choice.correct ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {/* The tick carries the meaning, so the space it takes is held
                  on every row — a list that shifts sideways at the answer is
                  harder to read down than one that does not. */}
              <Check
                className={cn('mt-px size-3 flex-none', !choice.correct && 'invisible')}
                aria-hidden={!choice.correct}
                aria-label={choice.correct ? 'The answer' : undefined}
              />
              <span className="whitespace-pre-wrap">{choice.text}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-2xs text-muted-foreground">{review.marking}</p>
    </div>
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
      kicker="Assessment · Set assignments"
      title={title}
      description={
        description ||
        'Each question is worth what you give it, and the assignment is worth all of them added up.'
      }
      action={action}
    />
  )
}
