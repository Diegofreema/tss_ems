import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'
import {
  useAddQuestion,
  useSetAssignment,
  useSetAssignmentQuestions,
  useRemoveQuestion,
  useUpdateQuestion,
} from '@/api/set-assignments/hooks'
import type { AssignmentQuestion } from '@/api/set-assignments/types'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/use-confirm'
import { QuestionCard } from './question-card'
import { QuestionForm } from './question-form'
import {
  blankQuestion,
  questionBody,
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
 */
export function QuestionsPage() {
  const [assignmentId] = useQueryState('assignment', parseAsString.withDefault(''))
  const assignment = useSetAssignment(assignmentId || undefined)
  const questions = useSetAssignmentQuestions(assignmentId || undefined)
  const add = useAddQuestion(assignmentId)
  const update = useUpdateQuestion(assignmentId)
  const remove = useRemoveQuestion(assignmentId)
  const confirm = useConfirm()

  /** Nothing open, the new question, or the id of the one being rewritten. */
  const [editing, setEditing] = useState<'new' | number | null>(null)

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

  if (assignment.isPending || questions.isPending) {
    return (
      <>
        <Header title="Write the questions" />
        <TableSkeleton rows={4} />
      </>
    )
  }

  // `paper` is the server's key for the assignment; the word is not ours.
  const record = assignment.data?.paper
  const written = questions.data?.questions ?? []
  const marks = questions.data?.total_marks ?? totalMarks(written)

  const save = async (values: QuestionValues) => {
    const body = questionBody(values)
    await (editing === 'new'
      ? add.mutateAsync(body)
      : update.mutateAsync({ questionId: editing as number, body })
    )
      // A refusal has already been announced by the mutation cache. The form
      // stays open holding what was typed, so it can be sent again.
      .then(() => setEditing(null))
      .catch(() => undefined)
  }

  const askDelete = (question: AssignmentQuestion) =>
    confirm.ask({
      title: 'Delete this question?',
      body: 'It goes from the assignment, and the assignment is worth that much less. A pupil who has already sat the assignment keeps the answer they gave.',
      subject: question.question_text?.trim() || `Question ${question.id}`,
      cta: 'Delete the question',
      cancel: 'Keep it',
      onConfirm: () => remove.mutateAsync(question.id).catch(() => undefined),
    })

  const opened = written.find((question) => question.id === editing)

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
          values={opened ? questionValues(opened) : blankQuestion()}
          submitLabel={editing === 'new' ? 'Add the question' : 'Save the question'}
          pending={add.isPending || update.isPending}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {written.length ? (
        <ul className="grid gap-2.5">
          {written.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              position={question.order_number ?? index + 1}
              onEdit={() => setEditing(question.id)}
              onDelete={() => askDelete(question)}
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
        {written.length} question{written.length === 1 ? '' : 's'} · {marks} mark
        {marks === 1 ? '' : 's'} in total
        {record?.passing_score != null && ` · pass at ${record.passing_score}%`}
        {record?.time_limit ? ` · ${record.time_limit} minutes allowed` : ''}
      </div>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
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
