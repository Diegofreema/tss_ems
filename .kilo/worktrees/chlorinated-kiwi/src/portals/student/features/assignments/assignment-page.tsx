import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { schoolMillis } from '@/features/collections/when'
import { serverNow } from '@/lib/server-clock'
import { studentAssignmentQuery } from '../../api/queries'
import { AssignmentBrief } from './assignment-brief'
import { AssignmentSitting } from './assignment-sitting'
import {
  attemptExpiry,
  clearAttempt,
  readAttempt,
  type StoredAttempt,
  writeAttempt,
} from './attempt'
import { limitSeconds, questionsOf, windowProblem } from './assignment'
import { stateOf } from './assignments'

/**
 * One assignment: its terms first, and its questions only once the student says they
 * are ready.
 *
 * The brief is not ceremony. An assignment can be sat once, the clock starts when it
 * is started, and `actual_start_time` is sent back as part of the submission —
 * so the moment the questions appear has to be a moment the student chose.
 *
 * It is shown once. A sitting already under way is resumed straight into the
 * questions, on the deadline it already had: the brief coming back would be the
 * offer of a second start, which is the whole of the bug this guards against.
 */
export function AssignmentPage({ assignmentId }: { assignmentId: string }) {
  const { data: assignment } = useSuspenseQuery(studentAssignmentQuery(assignmentId))
  const { user } = useSession()
  const owner = user?.id == null ? '' : String(user.id)
  const [attempt, setAttempt] = useState<StoredAttempt | null>(() =>
    readAttempt(owner, assignmentId),
  )

  const submission = assignment.my_submission
  const problem = windowProblem(assignment)
  const questions = questionsOf(assignment)

  // Nothing left to resume: what is stored belongs to a sitting that is over,
  // and leaving it would resume a submitted assignment on a dead clock.
  useEffect(() => {
    if (submission) clearAttempt(owner, assignmentId)
  }, [submission, owner, assignmentId])

  const start = () => {
    const startedAt = serverNow()
    const begun: StoredAttempt = {
      assignmentId,
      startedAt,
      expiresAt: attemptExpiry(
        startedAt,
        limitSeconds(assignment),
        schoolMillis(assignment.assignment?.closedate),
      ),
      draft: {},
    }
    // Written before it is rendered, so a browser that dies between the two
    // still resumes on the clock the student actually started.
    writeAttempt(owner, begun)
    setAttempt(begun)
  }

  // The list's four states, worked out from the detail route's fields:
  // this route nulls `submitted` and `window_problem` inside `assignment` and
  // sends the truth beside it.
  const state = stateOf({
    ...assignment.assignment,
    submitted: Boolean(submission),
    window_problem: problem ?? null,
  })

  if (submission) {
    return (
      <AssignmentBrief
        assignment={assignment}
        state="Submitted"
        note="You have already sat this assignment. It can only be taken once, so what was sent is what will be marked."
        action={
          <Button asChild>
            <Link to="/student/assignments/$assignmentId/result" params={{ assignmentId }}>
              See how you did
            </Link>
          </Button>
        }
      />
    )
  }

  if (problem) {
    return <AssignmentBrief assignment={assignment} state={state} note={problem} />
  }

  if (!questions.length) {
    return (
      <AssignmentBrief
        assignment={assignment}
        state={state}
        note="Your teacher has not written any questions into this assignment yet. There is nothing to answer, so nothing to submit — check back before it closes."
      />
    )
  }

  if (!attempt) {
    return (
      <AssignmentBrief
        assignment={assignment}
        state={state}
        note="Read the terms above before you begin. The assignment can be taken once: when you submit it, that is the attempt the school marks. The clock starts when you press the button and keeps running if you leave the page, so start it when you are ready to sit it."
        action={<Button onClick={start}>Start the assignment</Button>}
      />
    )
  }

  return (
    <AssignmentSitting
      assignment={assignment}
      assignmentId={assignmentId}
      attempt={attempt}
      owner={owner}
    />
  )
}
