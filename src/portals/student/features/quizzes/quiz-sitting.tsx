import { Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Paper, type PaperQuestion, clockOf, paperOf } from '@/api/quizzes/pupil'
import { quizzesService } from '@/api/quizzes/service'
import { Tag } from '@/components/common/tag'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { refetchCollection } from '@/db/collection'
import { schoolingQuizzes } from '@/db/collections/schooling'
import { SET } from '@/db/ids'
import { useHeld } from '@/db/live'
import { schoolTime, when } from '@/features/collections/when'
import { useConfirm } from '@/hooks/use-confirm'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { serverNow } from '@/lib/server-clock'
import { toneForStatus } from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import { formatClock, isRunningOut } from '../assignments/clock'
import { OptionList } from '../assignments/option-list'
import { QuestionPips } from '../assignments/question-pips'
import { useCountdown } from '../assignments/use-countdown'
import { stateOf } from './quizzes'

/**
 * Sitting a quiz: open it, answer, hand it in, read the mark.
 *
 * **Online by design, and the one page in the student's portal that is.** A
 * quiz's clock and its marking are the school's: the clock starts when the
 * paper is first opened and never goes back, every answer is saved on the
 * school as it is given, and the mark is worked out the moment it is handed
 * in. None of that can be done by a device on its own, so nothing here is
 * queued — an answer that cannot reach the school says so beside the question
 * rather than pretending it was kept. What the device *does* keep is the list
 * (`schoolingQuizzes`), so a pupil with no signal can still see what is set.
 *
 * The clock is read three ways and the school's always wins: `seconds_left`
 * from opening the paper, the same from every heartbeat, and the device's own
 * countdown in between (`useCountdown`, which cannot be wound back). When it
 * reaches zero the paper is handed in as it stands; a heartbeat that finds the
 * time already gone has marked it on the school, and the page goes to the mark.
 */

/** How often the page tells the school the paper is still open. */
const HEARTBEAT_MS = 20_000

type Saving = 'saving' | 'saved' | 'failed'

export function QuizSitting({ quizId }: { quizId: string }) {
  const held = useHeld(schoolingQuizzes)
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [opening, setOpening] = useState(false)
  const [problem, setProblem] = useState<string>()
  const [current, setCurrent] = useState(0)
  const [saving, setSaving] = useState<Record<number, Saving>>({})
  const handedIn = useRef(false)

  const quiz = held.rows.find((one) => String(one.id) === quizId)

  const toResult = useCallback(() => {
    // The list says "Sat" from the school's own answer, not from this page.
    void refetchCollection(SET.schoolingQuizzes).catch(() => undefined)
    void navigate({ to: '/student/quizzes/$quizId/result', params: { quizId } })
  }, [navigate, quizId])

  /** The clock as the school has just stated it. Null is a paper with no clock. */
  const anchor = (secondsLeft: number | null) =>
    setDeadline(secondsLeft === null ? null : serverNow() + secondsLeft * 1000)

  const open = async () => {
    setOpening(true)
    setProblem(undefined)
    try {
      const opened = paperOf(await quizzesService.start(quizId))
      // `start` hands back the questions; a deployment that sends only the
      // clock is asked for the paper itself, which is safe on every reload.
      const full = opened.questions.length ? opened : { ...paperOf(await quizzesService.paper(quizId)), resumed: opened.resumed, secondsLeft: opened.secondsLeft }
      setPaper(full)
      anchor(full.secondsLeft)
      setCurrent(Math.max(0, full.questions.findIndex((question) => !question.chosen)))
    } catch (error) {
      setProblem(errorMessage(error, OFFLINE_MESSAGE))
    } finally {
      setOpening(false)
    }
  }

  const handIn = useCallback(async () => {
    if (handedIn.current) return
    handedIn.current = true
    try {
      await quizzesService.submit(quizId)
      toResult()
    } catch (error) {
      handedIn.current = false
      setProblem(errorMessage(error, OFFLINE_MESSAGE))
    }
  }, [quizId, toResult])

  // Still here: the school's clock, and the marking if it has run out. A
  // missed beat is not an error a pupil can do anything about — the next one
  // tries again, and the device's own countdown carries on meanwhile.
  useEffect(() => {
    if (!paper) return
    const beat = async () => {
      try {
        const clock = clockOf(await quizzesService.heartbeat(quizId))
        if (clock.expired) {
          handedIn.current = true
          toResult()
          return
        }
        anchor(clock.secondsLeft)
      } catch {
        // Next beat.
      }
    }
    const timer = setInterval(beat, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [paper, quizId, toResult])

  const choose = async (question: PaperQuestion, choice: string) => {
    const before = question.chosen
    const next = before === choice ? '' : choice
    // Shown chosen at once; taken back if the school does not have it.
    setPaper((held) => held && withChoice(held, question.id, next))
    setSaving((state) => ({ ...state, [question.id]: 'saving' }))
    try {
      await quizzesService.answer(quizId, { question_id: question.id, choice: next })
      setSaving((state) => ({ ...state, [question.id]: 'saved' }))
    } catch {
      setPaper((held) => held && withChoice(held, question.id, before))
      setSaving((state) => ({ ...state, [question.id]: 'failed' }))
    }
  }

  // ── Before the paper is open ─────────────────────────────────────────────

  if (!paper) {
    if (held.pending) return <TableSkeleton rows={3} />
    if (!quiz) {
      return (
        <EmptyState
          title="This quiz is not on your list"
          body="It may have closed, or it may be set for another class. Your quizzes are listed under Quizzes."
          action={
            <Button asChild>
              <Link to="/student/quizzes">Back to my quizzes</Link>
            </Button>
          }
        />
      )
    }

    const state = stateOf(quiz)
    const terms = [
      { label: 'Subject', value: quiz.subject ?? '—' },
      { label: 'Marks', value: quiz.marks == null ? '—' : String(quiz.marks) },
      { label: 'Questions', value: quiz.asks ? String(quiz.asks) : '—' },
      { label: 'Time allowed', value: quiz.minutes ? `${quiz.minutes} minutes` : 'No clock' },
      { label: 'Pass mark', value: quiz.passMark == null ? 'None' : `${quiz.passMark}%` },
      { label: 'Closes', value: when(schoolTime(quiz.closes), true) },
    ]

    return (
      <div className="mx-auto w-full max-w-[720px]">
        <div className="text-2xs uppercase tracking-kicker text-brand-700">Quiz</div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-page-title">{quiz.name}</h2>
          <Tag variant={toneForStatus(state)}>{state}</Tag>
        </div>
        <Rule />
        {quiz.description && (
          <p className="mb-6 border-l-2 border-brand pl-4 text-base leading-relaxed">
            {quiz.description}
          </p>
        )}
        <div className="overflow-hidden rounded-xl border border-foreground/60 bg-raised">
          {terms.map((term) => (
            <div key={term.label} className="flex gap-4 border-b border-divider px-5 py-3 last:border-b-0">
              <div className="w-[44%] text-2xs uppercase tracking-label text-muted-foreground">
                {term.label}
              </div>
              <div className="flex-1 text-sm tabular-nums">{term.value}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {state === 'Sat'
            ? 'You have sat this quiz. It was marked the moment you handed it in.'
            : state === 'Carry on'
              ? 'You have already opened this quiz. Opening it again carries on where you left off — the clock did not stop while you were away.'
              : state === 'Open'
                ? `Each answer is saved on the school as you give it, and the quiz is marked the moment you hand it in.${quiz.minutes ? ' The clock starts when you open it and keeps running if you leave the page.' : ''} You need a connection the whole way through.`
                : 'This quiz cannot be sat now.'}
        </p>
        {problem && (
          <p className="mt-3 rounded-md border-l-2 border-danger bg-danger-subtle px-3.5 py-2.5 text-sm text-danger-ink">
            {problem}
          </p>
        )}
        <Rule />
        <div className="flex flex-wrap gap-2.5">
          {state === 'Sat' && (
            <Button asChild>
              <Link to="/student/quizzes/$quizId/result" params={{ quizId }}>
                See your mark
              </Link>
            </Button>
          )}
          {(state === 'Open' || state === 'Carry on') && (
            <Button pending={opening} onClick={open}>
              {state === 'Carry on' ? 'Carry on' : 'Start the quiz'}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/student/quizzes">Back to my quizzes</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── The paper ────────────────────────────────────────────────────────────

  const questions = paper.questions
  const question = questions[current]
  const unanswered = questions.filter((one) => !one.chosen).length

  const askHandIn = () =>
    confirm.ask({
      title: 'Hand in your quiz?',
      body: unanswered
        ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} not answered, and will score nothing. Your answers cannot be changed once it is in.`
        : 'Your answers cannot be changed once it is in. You will see your mark straight away.',
      subject: paper.name ?? quiz?.name ?? 'This quiz',
      cta: 'Hand it in',
      cancel: 'Keep going',
      tone: 'brand',
      onConfirm: handIn,
    })

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xs uppercase tracking-kicker text-brand-700">Quiz</div>
          <h2 className="mt-2 text-page-title">{paper.name ?? quiz?.name ?? 'Quiz'}</h2>
          {paper.resumed && (
            <p className="mt-1 text-sm text-muted-foreground">Carried on where you left off.</p>
          )}
        </div>
        <QuizClock deadline={deadline} onExpired={handIn} />
      </div>
      <Rule />

      {problem && (
        <p className="mb-4 rounded-md border-l-2 border-danger bg-danger-subtle px-3.5 py-2.5 text-sm text-danger-ink">
          {problem}
        </p>
      )}

      {questions.length ? (
        <>
          <QuestionPips
            count={questions.length}
            current={current}
            answered={(index) => Boolean(questions[index]?.chosen)}
            onJump={setCurrent}
          />
          {question && (
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  <span className="mr-2 font-heading font-extrabold text-muted-foreground">
                    {current + 1}.
                  </span>
                  {question.question}
                </p>
                {question.mark != null && (
                  <span className="flex-none text-2xs text-muted-foreground tabular-nums">
                    {question.mark} mark{question.mark === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <OptionList
                options={question.options.map(([number, text]) => ({
                  id: Number(number),
                  option_text: text,
                  order_number: Number(number),
                }))}
                chosen={question.chosen ? Number(question.chosen) : undefined}
                onChoose={(number) => void choose(question, String(number))}
              />
              <p
                className={cn(
                  'mt-2 h-4 text-2xs',
                  saving[question.id] === 'failed' ? 'text-danger-ink' : 'text-muted-foreground',
                )}
              >
                {saving[question.id] === 'saving'
                  ? 'Saving…'
                  : saving[question.id] === 'saved'
                    ? 'Saved'
                    : saving[question.id] === 'failed'
                      ? 'Not saved — the school could not be reached. Choose again.'
                      : ''}
              </p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-between gap-2.5">
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => setCurrent((at) => at - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={current >= questions.length - 1}
                onClick={() => setCurrent((at) => at + 1)}
              >
                Next
              </Button>
            </div>
            <Button onClick={askHandIn}>Hand it in</Button>
          </div>
        </>
      ) : (
        <EmptyState
          title="This paper holds no questions"
          body="There is nothing to answer. Tell your teacher."
        />
      )}

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}

function withChoice(paper: Paper, questionId: number, chosen: string): Paper {
  return {
    ...paper,
    questions: paper.questions.map((question) =>
      question.id === questionId ? { ...question, chosen } : question,
    ),
  }
}

/** The school's clock, as a countdown. No clock on the paper, no countdown here. */
function QuizClock({ deadline, onExpired }: { deadline: number | null; onExpired: () => void }) {
  const { seconds } = useCountdown(deadline)
  const fired = useRef(false)

  useEffect(() => {
    if (deadline === null || seconds > 0 || fired.current) return
    fired.current = true
    onExpired()
  }, [deadline, seconds, onExpired])

  if (deadline === null) return null
  return (
    <div className="text-right">
      <div className="text-2xs uppercase tracking-label text-muted-foreground">Time left</div>
      <div
        role="timer"
        aria-live="off"
        className={cn(
          'font-heading text-3xl font-extrabold tabular-nums',
          isRunningOut(seconds) && 'text-danger-ink',
        )}
      >
        {formatClock(seconds)}
      </div>
    </div>
  )
}
