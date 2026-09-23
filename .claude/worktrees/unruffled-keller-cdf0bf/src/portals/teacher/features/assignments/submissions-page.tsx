import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import {
  useGradeSubmission,
  useSetAssignment,
  useSetAssignmentSubmissions,
  useSubmission,
} from '@/api/set-assignments/hooks'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { MarkingSheet, type MarkingValues } from './marking-sheet'
import { gradeBody, submissionRows } from './marking'
import { SubmissionList } from './submission-list'

/**
 * Marking an assignment: what the pupils sent back, and then one of them.
 *
 * Both are in the URL rather than in the route — `?assignment` for what came
 * back and `?submission` for one of them — so a teacher stopped halfway can be
 * sent back to exactly the script they were reading, and closing a marked
 * submission returns them to the list rather than out of the flow.
 */
export function SubmissionsPage() {
  const [assignmentId] = useQueryState('assignment', parseAsString.withDefault(''))
  const [submissionId, setSubmission] = useQueryState(
    'submission',
    parseAsString.withDefault(''),
  )

  const assignment = useSetAssignment(assignmentId || undefined)
  const list = useSetAssignmentSubmissions(assignmentId || undefined)
  const marking = useSubmission(submissionId || undefined)
  const grade = useGradeSubmission(submissionId)

  if (!assignmentId) {
    return (
      <>
        <Header title="Marking" />
        <EmptyState
          title="No assignment chosen"
          body="Choose an assignment and this is where the answers your pupils sent back are marked."
          action={
            <Button asChild>
              <Link to="/teacher/assignments">Choose an assignment</Link>
            </Button>
          }
        />
      </>
    )
  }

  if (assignment.isPending || list.isPending) {
    return (
      <>
        <Header title="Marking" />
        <TableSkeleton rows={4} />
      </>
    )
  }

  // `paper` is the server's key for the assignment; the word is not ours.
  const record = assignment.data?.paper
  const title = record?.title?.trim() || 'Marking'
  const where = [record?.subject, record?.class, record?.semester]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' · ')

  if (submissionId) {
    if (marking.isPending) {
      return (
        <>
          <Header title={title} description={where} />
          <TableSkeleton rows={4} />
        </>
      )
    }

    const submission = marking.data
    const answers = submission?.answers ?? []
    // `graded_at` is the marking view's own answer to "has anybody marked it";
    // the list beside it says `graded`, and neither is on the other.
    const head = submission?.submission
    const marked = Boolean(head?.graded_at) || head?.total_score != null
    const pupil = head?.student?.trim() || 'This pupil'

    const save = async (values: MarkingValues) => {
      await grade
        .mutateAsync(
          gradeBody({ answers, scores: values.scores, comment: values.comment, marked }),
        )
        // A refusal has already been announced by the mutation cache; the sheet
        // stays open holding the marks so they can be sent again.
        .then(() => setSubmission(null))
        .catch(() => undefined)
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
          title={pupil}
          description={[title, where].filter(Boolean).join(' · ')}
        />
        <Rule />

        {submission ? (
          <MarkingSheet
            submission={submission}
            marked={marked}
            pending={grade.isPending}
            onSave={save}
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

  const submissions = list.data?.submissions ?? []

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
        rows={submissionRows(submissions)}
        sat={list.data?.sat ?? submissions.length}
        marked={list.data?.marked ?? 0}
        waiting={list.data?.waiting ?? 0}
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
        'What your pupils submitted, for you to mark. The school scores the multiple choice itself; the written answers, and the note beside the mark, are yours.'
      }
      action={action}
    />
  )
}
