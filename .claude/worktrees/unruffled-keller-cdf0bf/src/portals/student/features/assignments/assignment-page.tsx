import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { studentAssignmentQuery } from '../../api/queries'
import { AssignmentBrief } from './assignment-brief'
import { AssignmentSitting } from './assignment-sitting'
import { questionsOf, windowProblem } from './assignment'
import { stateOf } from './assignments'

/**
 * One assignment: its terms first, and its questions only once the pupil says they
 * are ready.
 *
 * The brief is not ceremony. An assignment can be sat once, the clock starts when it
 * is started, and `actual_start_time` is sent back as part of the submission —
 * so the moment the questions appear has to be a moment the pupil chose.
 */
export function AssignmentPage({ assignmentId }: { assignmentId: string }) {
  const { data: assignment } = useSuspenseQuery(studentAssignmentQuery(assignmentId))
  const [openedAt, setOpenedAt] = useState<Date | null>(null)

  const submission = assignment.my_submission
  const problem = windowProblem(assignment)
  const questions = questionsOf(assignment)

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

  if (!openedAt) {
    return (
      <AssignmentBrief
        assignment={assignment}
        state={state}
        note="Read the terms above before you begin. The assignment can be taken once: when you submit it, that is the attempt the school marks."
        action={<Button onClick={() => setOpenedAt(new Date())}>Start the assignment</Button>}
      />
    )
  }

  return <AssignmentSitting assignment={assignment} assignmentId={assignmentId} openedAt={openedAt} />
}
