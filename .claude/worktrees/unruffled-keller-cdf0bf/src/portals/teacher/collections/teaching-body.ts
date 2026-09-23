import type {
  CreateTopicBody,
  TeacherClassArm,
  UpdateTopicBody,
  UploadResultsBody,
} from '../../../api/teaching/types.ts'
import type { MarkingTerm } from '../features/term/term.ts'

type FormValues = Record<string, unknown>

function text(values: FormValues, key: string): string {
  const value = values[key]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * A topic as `POST /teachers/me/topics` wants it. The subject is refused with
 * a 403 unless it is one of the teacher's own, which is why the form's feed is
 * their subject list rather than the school's.
 */
export function topicBody(values: FormValues): CreateTopicBody {
  return {
    subject_id: Number(text(values, 'subject_id')) || 0,
    title: text(values, 'title'),
    contents: text(values, 'contents'),
  }
}

/**
 * The same on an edit. `POST /teachers/me/topics/{id}` takes the title and the
 * contents only — a topic filed under the wrong subject is added again under
 * the right one, not moved.
 */
export function topicUpdate(values: FormValues): UpdateTopicBody {
  return { title: text(values, 'title'), contents: text(values, 'contents') }
}

/**
 * A results spreadsheet as `POST /teachers/me/uploads` wants it.
 *
 * The endpoint wants five ids beside the file. Two come from the arm chosen —
 * an arm knows its class — and two are the term, which a teaching login cannot
 * read from the school calendar and which is taken off their own marks.
 */
export function uploadBody(
  values: FormValues,
  arm: TeacherClassArm | undefined,
  term: MarkingTerm | undefined,
): UploadResultsBody {
  const file = values.result
  if (!(file instanceof File)) throw new Error('Choose the results file to upload.')
  if (!arm) throw new Error('Choose one of the arms you take.')
  if (!term) {
    throw new Error(
      'There is no term to file these into yet. Ask the office to record your first mark of the term.',
    )
  }

  return {
    result: file,
    subject_id: Number(text(values, 'subject_id')) || 0,
    class_arm_id: arm.id,
    // The class the arm belongs to, rather than a second thing to choose.
    department_id: arm.department_id,
    session_id: term.session_id,
    semester_id: term.semester_id,
  }
}
