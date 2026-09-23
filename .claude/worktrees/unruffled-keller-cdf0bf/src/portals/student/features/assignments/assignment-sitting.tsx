import { useNavigate } from '@tanstack/react-router'
import { parseAsInteger, useQueryState } from 'nuqs'
import { useEffect, useRef, useState } from 'react'
import type { AssignmentDetail } from '@/api/assignments/types'
import { useSubmitAssignment } from '@/api/assignments/hooks'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useConfirm } from '@/hooks/use-confirm'
import { cn } from '@/lib/utils'
import { formatClock, isRunningOut } from './clock'
import { OptionList } from './option-list'
import {
  answeredCount,
  type Draft,
  isAnswered,
  isTheory,
  limitSeconds,
  assignmentMeta,
  questionsOf,
  submitBody,
} from './assignment'
import { QuestionPips } from './question-pips'
import { useCountdown } from './use-countdown'

/**
 * The assignment itself, one question at a time.
 *
 * `openedAt` is passed in rather than taken here: the endpoint wants when the
 * pupil actually started, and that is the moment they pressed the button on
 * the brief, not the moment this component happened to mount.
 */
export function AssignmentSitting({
  assignment,
  assignmentId,
  openedAt,
}: {
  assignment: AssignmentDetail
  assignmentId: string
  openedAt: Date
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const submit = useSubmitAssignment(assignmentId)
  const questions = questionsOf(assignment)
  const total = questions.length

  const [draft, setDraft] = useState<Draft>({})
  const [questionParam, setQuestion] = useQueryState('q', parseAsInteger.withDefault(1))

  const index = Math.min(Math.max(1, questionParam), Math.max(1, total)) - 1
  const question = questions[index]
  const answered = answeredCount(draft, questions)

  const send = () =>
    submit
      .mutateAsync(submitBody(draft, questions, openedAt))
      .then(() => navigate({ to: '/student/assignments/$assignmentId/result', params: { assignmentId } }))
      // The toast has already said what went wrong; the assignment stays put so the
      // answers are not lost with it.
      .catch(() => undefined)

  return (
    <div className="max-w-[820px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] text-brand-700">
            Assignment
          </div>
          <h2 className="mt-2 text-page-title">
            {assignment.assignment?.title?.trim() || 'This assignment'}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{assignmentMeta(assignment)}</p>
        </div>
        <AssignmentClock assignment={assignment} onExpired={send} />
      </div>
      <Rule />

      <QuestionPips
        count={total}
        current={index}
        answered={(at) => {
          const one = questions[at]
          // The same test the counter below uses. A theory box holding only
          // spaces is not an answer, and a filled pip over "3 of 4 answered"
          // is the assignment telling the pupil two different things at once.
          return one ? isAnswered(draft, one) : false
        }}
        onJump={(next) => void setQuestion(next + 1)}
      />

      {question && (
        <div key={question.id} className="animate-ems-up">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Question {index + 1} of {total}
            {question.points ? ` · ${question.points} marks` : ''}
          </div>
          <h3 className="my-2.5 mb-[22px] text-2xl leading-[1.25] text-pretty">
            {question.question_text?.trim() || `Question ${index + 1}`}
          </h3>

          {isTheory(question) ? (
            <Textarea
              rows={8}
              value={String(draft[question.id] ?? '')}
              placeholder="Write your answer here."
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, [question.id]: event.target.value }))
              }
            />
          ) : (
            <OptionList
              options={question.options ?? []}
              chosen={
                typeof draft[question.id] === 'number'
                  ? (draft[question.id] as number)
                  : undefined
              }
              onChoose={(optionId) =>
                setDraft((previous) => ({ ...previous, [question.id]: optionId }))
              }
            />
          )}
        </div>
      )}

      <div className="mt-[26px] flex flex-wrap items-center gap-2.5">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => void setQuestion(index)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={index >= total - 1}
          onClick={() => void setQuestion(index + 2)}
        >
          Next question
        </Button>
        <div className="flex-1" />
        <div className="text-xs text-muted-foreground">
          {answered} of {total} answered
        </div>
        <Button
          disabled={submit.isPending}
          onClick={() =>
            confirm.ask({
              title: 'Submit and finish?',
              body: 'Once you submit you cannot come back to this assignment or change an answer. Any question you left blank is marked zero.',
              subject: `${answered} of ${total} questions answered`,
              cancel: 'Keep working',
              cta: 'Submit assignment',
              // Handed back rather than fired, so the dialog holds with its
              // button spinning until the school has actually taken it.
              onConfirm: send,
            })
          }
        >
          {submit.isPending ? 'Submitting…' : 'Submit assignment'}
        </Button>
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}

/**
 * The clock, on an assignment that sets a limit.
 *
 * An assignment without one shows its closing time instead of a countdown: a timer
 * running down to a deadline the school never set would be inventing one.
 */
function AssignmentClock({
  assignment,
  onExpired,
}: {
  assignment: AssignmentDetail
  onExpired: () => void
}) {
  const allowed = limitSeconds(assignment)
  const { seconds } = useCountdown(allowed ?? 0)
  // Once, on the tick that reaches zero. The assignment goes in as it stands, which
  // is what "time allowed" means — the alternative is a pupil holding answers
  // the school will not accept.
  const sent = useRef(false)

  useEffect(() => {
    if (allowed === null || seconds > 0 || sent.current) return
    sent.current = true
    onExpired()
  }, [allowed, seconds, onExpired])

  if (allowed === null) return null

  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        Time left
      </div>
      <div
        role="timer"
        aria-live="off"
        className={cn(
          'font-heading text-[30px] font-extrabold tabular-nums',
          isRunningOut(seconds) && 'text-brand',
        )}
      >
        {formatClock(seconds)}
      </div>
    </div>
  )
}
