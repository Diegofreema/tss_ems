import { Link } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { Check, Download, Plus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import { toast } from 'sonner'
import { quizzesService } from '@/api/quizzes/service'
import type { QuizQuestion, QuizStatus } from '@/api/quizzes/types'
import { Tag } from '@/components/common/tag'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { collectionError } from '@/db/collection'
import { teachingQuizRecords, teachingQuizzes } from '@/db/collections/quizzes'
import { enqueue } from '@/db/drain'
import { SET, WRITE } from '@/db/ids'
import { useHeld } from '@/db/live'
import { DRAWN_STATES, newLocalKey, type OutboxOp } from '@/db/outbox'
import { outbox } from '@/db/store'
import { useConfirm } from '@/hooks/use-confirm'
import { saveBlob } from '@/lib/download'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { QuizQuestionForm } from './quiz-question-form'
import {
  blankQuizQuestion,
  composeQuizQuestions,
  type Landed,
  NOTHING_LANDED,
  optionEntries,
  type PageQuizQuestion,
  QUIZ_KIND,
  quizMarks,
  quizQuestionBody,
  quizQuestionValues,
  type QuizQuestionValues,
  withLanded,
} from './quiz-question'

/**
 * One quiz: its questions and answer key, and the step that opens it to the
 * class.
 *
 * The questions come off the device and every write is queued — a quiz can be
 * written in full with no connection, as an assignment's questions can.
 * Publishing is queued too, and the school still has the last word: it refuses
 * a quiz with no questions, or with a question whose answer is not recorded,
 * and the queue raises that refusal on this page in the school's own words.
 *
 * Once anybody has sat it the questions are the record of what they were
 * asked, so the page stops offering to change them.
 */
export function QuizPage() {
  const [quizId] = useQueryState('quiz', parseAsString.withDefault(''))
  const quizzes = useHeld(teachingQuizzes)
  const records = useHeld(teachingQuizRecords)
  const queue = useLiveQuery({ query: (q) => q.from({ op: outbox() }) })
  const confirm = useConfirm()
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const [exporting, setExporting] = useState(false)
  /** What the school took in this sitting, until the record catches up — see `withLanded`. */
  const [landed, setLanded] = useState<Landed>(NOTHING_LANDED)
  /**
   * A publish or close the school took, and the status the record still
   * showed when it did. Drawn only while the record still shows that — once
   * it moves, the record is the answer, whatever it says.
   */
  const [sentStatus, setSentStatus] = useState<{ to: QuizStatus; from: string } | null>(null)

  if (!quizId) {
    return (
      <>
        <Header title="Quiz questions" />
        <EmptyState
          title="No quiz chosen"
          body="Choose a quiz and this is where its questions are written."
          action={
            <Button asChild>
              <Link to="/teacher/quizzes">Choose a quiz</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (quizzes.pending || records.pending) {
    return (
      <>
        <Header title="Quiz questions" />
        <TableSkeleton rows={4} />
      </>
    )
  }

  if (records.failed) {
    return (
      <>
        <Header title="Quiz questions" />
        <EmptyState
          title="This quiz could not be read"
          body={errorMessage(collectionError(SET.teachingQuizRecords), OFFLINE_MESSAGE)}
        />
      </>
    )
  }

  const listed = quizzes.rows.find((quiz) => String(quiz.id) === quizId)
  const record = records.rows.find((doc) => String(doc.id) === quizId)
  const quiz = record?.quiz ?? listed
  const ops = (queue.data ?? []) as OutboxOp[]
  const composed = composeQuizQuestions(
    withLanded(record?.quiz.questions ?? [], landed),
    ops,
    quizId,
  )
  const marks = quizMarks(composed.map((entry) => entry.question))
  const sat = Number(record?.sittings ?? 0)
  const locked = sat > 0
  const name = quiz?.name?.trim() || `quiz ${quizId}`

  // A publish or close still on this device is what the page says the quiz is
  // about to be; the banner and the drawer say it has not got there yet.
  const pendingStatus = [...ops]
    .sort((a, b) => a.seq - b.seq)
    .filter(
      (op) =>
        op.handler === WRITE.publishQuiz &&
        DRAWN_STATES.includes(op.state) &&
        String((op.payload as { id?: unknown }).id) === quizId,
    )
    .map((op) => (op.payload as { body: { status: string } }).body.status)
    .at(-1)
  const held = quiz?.status ?? 'draft'
  const status =
    pendingStatus ?? (sentStatus && sentStatus.from === held ? sentStatus.to : held)
  // The school's reason is about the record as it was; a quiz it has just
  // taken a question for, or just opened, may no longer have that problem.
  const problem =
    landed.added.length || sentStatus ? undefined : record?.publish_problem?.trim()

  const write = async (values: QuizQuestionValues) => {
    if (editing === 'new') {
      const outcome = await enqueue({
        handler: WRITE.addQuizQuestion,
        payload: { quiz_id: quizId, body: quizQuestionBody(values, composed.length + 1) },
        collectionId: SET.teachingQuizRecords,
        targetKey: newLocalKey(),
        toast: { success: 'Question added' },
        label: `A question for “${name}”`,
        onSent: (answer) => {
          const filed = answer as QuizQuestion | null
          if (filed && typeof filed.id === 'number') {
            setLanded((was) => ({ ...was, added: [...was.added, filed] }))
          }
        },
      })
      if (outcome === 'refused') return
    } else {
      const body = quizQuestionBody(values)
      const key = String(editing)
      const outcome = await enqueue({
        handler: WRITE.updateQuizQuestion,
        payload: { quiz_id: quizId, question_id: key, body },
        collectionId: SET.teachingQuizRecords,
        toast: { success: 'Question saved' },
        label: `A question of “${name}”`,
        onSent: () =>
          setLanded((was) => ({ ...was, rewritten: { ...was.rewritten, [key]: body } })),
      })
      if (outcome === 'refused') return
    }
    setEditing(null)
  }

  const askDelete = (entry: PageQuizQuestion) =>
    confirm.ask({
      title: 'Delete this question?',
      body:
        status === 'active' && composed.length === 1
          ? 'It is the last question on an open quiz, so the school sends the quiz back to draft — the class is never offered a paper with nothing in it.'
          : 'It goes from the quiz, and the quiz is worth that much less.',
      subject: entry.question.question?.trim() || `Question ${entry.key}`,
      cta: 'Delete the question',
      cancel: 'Keep it',
      onConfirm: () => {
        enqueue({
          handler: WRITE.removeQuizQuestion,
          payload: { quiz_id: quizId, question_id: entry.key },
          collectionId: SET.teachingQuizRecords,
          toast: { success: 'Question deleted' },
          label: 'A quiz question',
          onSent: () =>
            setLanded((was) => ({ ...was, removed: [...was.removed, entry.key] })),
        })
      },
    })

  const setStatus = (next: 'active' | 'closed') =>
    confirm.ask({
      title: next === 'active' ? 'Open this quiz to the class?' : 'Close this quiz?',
      body:
        next === 'active'
          ? 'Pupils can start sitting it inside its window, and the class and their guardians are told. Check the answer key first — the quiz marks itself.'
          : 'Nobody can start it after this. Pupils who sat it keep their marks, and you can open it again later.',
      subject: name,
      cta: next === 'active' ? 'Open the quiz' : 'Close the quiz',
      cancel: 'Not yet',
      tone: next === 'active' ? 'brand' : 'danger',
      onConfirm: () =>
        enqueue({
          handler: WRITE.publishQuiz,
          payload: { id: quizId, body: { status: next } },
          collectionId: SET.teachingQuizzes,
          targetKey: quizId,
          toast: { success: next === 'active' ? 'Quiz opened — the class has been told' : 'Quiz closed' },
          label: `${next === 'active' ? 'Opening' : 'Closing'} “${name}”`,
          onSent: () => setSentStatus({ to: next, from: held }),
        }).then(() => undefined),
    })

  /*
   * Straight to the school, not through the queue or a query: a spreadsheet
   * of marks is wanted now, from the school's own figures, and there is
   * nothing for a device to hold for it in the meantime.
   */
  const exportResults = async () => {
    setExporting(true)
    try {
      saveBlob(await quizzesService.export(quizId), `${name.replace(/[^\w-]+/g, '-')}-results.csv`)
    } catch (error) {
      toast.error(errorMessage(error, OFFLINE_MESSAGE))
    } finally {
      setExporting(false)
    }
  }

  const opened = composed.find((entry) => entry.key === editing)

  return (
    <>
      <Header
        title={quiz?.name?.trim() || 'Quiz questions'}
        description={[quiz?.subject, quiz?.class].map((part) => part?.trim()).filter(Boolean).join(' · ')}
        action={
          editing === null && (
            <div className="flex flex-wrap gap-2.5">
              <Button asChild variant="outline">
                <Link
                  to="/teacher/$collection/$recordId"
                  params={{ collection: 'quizzes', recordId: quizId }}
                >
                  Details and results
                </Link>
              </Button>
              {status !== 'draft' && (
                <Button variant="outline" pending={exporting} onClick={exportResults}>
                  {!exporting && <Download />} Export results
                </Button>
              )}
              {status === 'active' ? (
                <Button variant="outline" onClick={() => setStatus('closed')}>
                  Close the quiz
                </Button>
              ) : (
                <Button
                  variant={composed.length && !locked ? 'outline' : 'default'}
                  onClick={() => setStatus('active')}
                  disabled={!composed.length}
                >
                  {status === 'closed' ? 'Open it again' : 'Open to the class'}
                </Button>
              )}
              {!locked && (
                <Button onClick={() => setEditing('new')}>
                  <Plus /> Add a question
                </Button>
              )}
            </div>
          )
        }
      />
      <Rule />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Tag>{pendingStatus ? 'Waiting to send' : STATUS_WORD[status] ?? status}</Tag>
        <span>
          {composed.length} question{composed.length === 1 ? '' : 's'} · {marks} mark
          {marks === 1 ? '' : 's'}
          {quiz?.asks ? ` · each pupil is asked ${quiz.asks}` : ''}
          {quiz?.duration_minutes ? ` · ${quiz.duration_minutes} minutes` : ' · no clock'}
          {quiz?.pass_mark_percent != null ? ` · pass at ${quiz.pass_mark_percent}%` : ''}
          {sat ? ` · sat by ${sat}` : ''}
        </span>
      </div>

      {status === 'draft' && problem && (
        <p className="mb-5 rounded-lg border border-warn/50 bg-warn-subtle px-4 py-3 text-sm text-warn-ink">
          {problem}
        </p>
      )}
      {locked && (
        <p className="mb-5 rounded-lg border border-divider bg-raised px-4 py-3 text-sm text-muted-foreground">
          {sat === 1 ? 'A pupil has' : `${sat} pupils have`} sat this quiz, so its questions are the
          record of what they were asked and can no longer be changed. Its name, instructions and
          closing date still can.
        </p>
      )}

      {editing !== null && (
        <QuizQuestionForm
          key={String(editing)}
          values={opened ? quizQuestionValues(opened.question) : blankQuizQuestion()}
          submitLabel={editing === 'new' ? 'Add the question' : 'Save the question'}
          onSubmit={write}
          onCancel={() => setEditing(null)}
        />
      )}

      {composed.length ? (
        <ul className="grid gap-2.5">
          {composed.map((entry, index) => (
            <QuizQuestionCard
              key={entry.key}
              question={entry.question}
              position={index + 1}
              waiting={entry.waiting}
              onEdit={entry.waiting || locked ? undefined : () => setEditing(entry.key)}
              onDelete={entry.waiting || locked ? undefined : () => askDelete(entry)}
            />
          ))}
        </ul>
      ) : (
        editing === null && (
          <EmptyState
            title="No questions yet"
            body="A quiz with no questions cannot be opened to the class. Write them, check the answer key, then open it."
            action={<Button onClick={() => setEditing('new')}>Add a question</Button>}
          />
        )
      )}

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </>
  )
}

const STATUS_WORD: Record<string, string> = {
  draft: 'Draft',
  active: 'Open',
  closed: 'Closed',
}

/** One question as the teacher reads it back, answer key shown — this is where it is checked. */
function QuizQuestionCard({
  question,
  position,
  waiting,
  onEdit,
  onDelete,
}: {
  question: QuizQuestion
  position: number
  waiting: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const mark = question.mark ?? 0
  const right = question.correct_option == null ? '' : String(question.correct_option)
  const options = optionEntries(question)

  return (
    <li className="animate-ems-up rounded-lg border border-divider bg-raised p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="font-heading text-sm font-extrabold tabular-nums text-muted-foreground">
            {position}.
          </span>
          <div>
            <p className="text-sm whitespace-pre-wrap">
              {question.question?.trim() || 'This question has no wording yet'}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Tag>{QUIZ_KIND[question.question_type ?? 'multiple_choice']}</Tag>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {mark} mark{mark === 1 ? '' : 's'}
              </span>
              {waiting && <Tag>Waiting to send</Tag>}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <ul className="mt-3 grid gap-1 pl-7">
        {options.map(([number, text]) => (
          <li key={number} className="flex items-center gap-2 text-sm">
            {number === right ? (
              <Check className="size-3.5 text-brand" aria-label="The right answer" />
            ) : (
              <span className="size-3.5" />
            )}
            <span className={cn(number === right ? 'text-foreground' : 'text-muted-foreground')}>
              {text.trim() || '—'}
            </span>
          </li>
        ))}
        {(question.markable === false || !right) && !waiting && (
          <li className="text-2xs text-danger-ink">
            No answer is recorded, so the school cannot mark this one — and will not open the quiz
            until it is.
          </li>
        )}
      </ul>
    </li>
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
      kicker="Assessment · Quizzes"
      title={title}
      description={
        description ||
        'Objective questions the school marks the moment a pupil hands the quiz in.'
      }
      action={action}
    />
  )
}
