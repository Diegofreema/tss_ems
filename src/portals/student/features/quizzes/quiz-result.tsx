import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { resultOf } from '@/api/quizzes/pupil'
import { quizKeys } from '@/api/quizzes/keys'
import { quizzesService } from '@/api/quizzes/service'
import { Tag } from '@/components/common/tag'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { schoolingQuizzes } from '@/db/collections/schooling'
import { useHeld } from '@/db/live'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { toneForStatus } from '@/lib/status-tone'

/**
 * A quiz's mark, once it is handed in.
 *
 * A plain query rather than a set on the device, and deliberately: this is
 * one figure per quiz, asked for once, straight after the hand-in that
 * produced it — and the school answers 404 before then, which a collection
 * would hold as a refusal for the whole set. `networkMode: 'always'` so a
 * device that thinks it is offline still asks rather than waiting forever.
 */
export function QuizResult({ quizId }: { quizId: string }) {
  const held = useHeld(schoolingQuizzes)
  const result = useQuery({
    queryKey: quizKeys.result(quizId),
    queryFn: () => quizzesService.result(quizId).then(resultOf),
    networkMode: 'always',
    retry: 1,
  })
  const quiz = held.rows.find((one) => String(one.id) === quizId)

  if (result.isPending) return <TableSkeleton rows={3} />
  if (result.isError) {
    return (
      <EmptyState
        title="Your mark could not be read"
        body={errorMessage(result.error, OFFLINE_MESSAGE)}
        action={
          <Button variant="outline" onClick={() => void result.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  const mark = result.data
  const verdict = mark.passed === true ? 'Passed' : mark.passed === false ? 'Failed' : undefined

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="text-2xs uppercase tracking-kicker text-brand-700">Quiz result</div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-page-title">{quiz?.name ?? 'Your quiz'}</h2>
        {verdict && <Tag variant={toneForStatus(verdict)}>{verdict}</Tag>}
      </div>
      <Rule />

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <div className="text-2xs uppercase tracking-label text-muted-foreground">Score</div>
          <div className="font-heading text-4xl font-extrabold tabular-nums">
            {mark.score ?? '—'}
            {mark.outOf != null && (
              <span className="text-xl text-muted-foreground"> / {mark.outOf}</span>
            )}
          </div>
        </div>
        {mark.percent != null && (
          <div>
            <div className="text-2xs uppercase tracking-label text-muted-foreground">Percentage</div>
            <div className="font-heading text-4xl font-extrabold tabular-nums">{mark.percent}%</div>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {mark.passMark != null
          ? `The pass mark is ${mark.passMark}%.`
          : verdict
            ? ''
            : 'This quiz has no pass mark, so it says nothing about passing.'}
        {mark.unmarkable > 0 &&
          ` ${mark.unmarkable} question${mark.unmarkable === 1 ? ' was' : 's were'} left out of your mark because the school has no answer recorded for ${mark.unmarkable === 1 ? 'it' : 'them'} — your teacher has been told.`}
      </p>
      <Rule />
      <Button asChild variant="outline">
        <Link to="/student/quizzes">Back to my quizzes</Link>
      </Button>
    </div>
  )
}
