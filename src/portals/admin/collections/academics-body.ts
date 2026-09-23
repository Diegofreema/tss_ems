import type { ClassArmBody, ClassArmStatus } from '../../../api/class-arms/types.ts'
import type { SubjectBody } from '../../../api/subjects/types.ts'

/** The form's values, all strings from the inputs and selects. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asId(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** The three words the API accepts; anything else it would default anyway. */
const STATUSES: readonly string[] = ['active', 'inactive', 'archived']

function asArmStatus(value: unknown): ClassArmStatus | undefined {
  const word = text(value)?.toLowerCase()
  return word && STATUSES.includes(word) ? (word as ClassArmStatus) : undefined
}

/**
 * The arm form as `POST /class-arms` wants it. An empty form teacher goes as
 * `''`, which the endpoint stores as null — leaving the key out instead would
 * keep whoever is already on the arm, so unassigning would be impossible.
 */
export function armBody(values: FormValues): ClassArmBody {
  return {
    arm_name: text(values.arm_name) ?? '',
    arm_description: text(values.arm_description),
    department_id: asId(values.department_id),
    class_teacher_id: asId(values.class_teacher_id) ?? '',
    status: asArmStatus(values.armstatus),
  }
}

/**
 * The subject form as `POST /subjects` wants it: the name, the class it
 * belongs to, and the teachers who carry it as a plain array of ids.
 *
 * `subjectcode` is not sent — the endpoint generates it from the name, the way
 * a class's code is generated from its own. Nor is `creditload`, which the
 * school has never set on a subject.
 *
 * `teachers` replaces the whole set rather than adding to it, so it is always
 * sent, including empty. Leaving it out of an edit that unticked the last
 * teacher would keep them on the subject.
 */
/**
 * The subject form as `POST /subjects` takes it.
 *
 * **Two keys, and they mean different things.** The create form asks which
 * classes take the subject and sends `department_ids`, which makes one subject
 * per class — the school appends the class name to each, so "Mathematics"
 * ticked against three classes comes back as three rows. The edit form asks
 * for the one home class and sends `department_id`, because editing a subject
 * into three subjects is not an edit.
 *
 * The plural is used even for a single class, so a create is one code path
 * whatever is ticked: `department_ids: [1]` answers `created: 1` with the home
 * class set, which is the same row the singular key makes.
 *
 * What is **never** sent is an array under the singular key. That is a 201
 * and a subject filed under no class at all — see `SubjectBody`.
 */
export function subjectBody(values: FormValues): SubjectBody {
  const classes = ids(values.department_ids)
  return {
    name: text(values.name),
    ...(classes.length
      ? { department_ids: classes }
      : { department_id: asId(values.department_id) }),
    teachers: ids(values.teacher_ids),
  }
}

/** A checkbox group holds the API's ids as strings; a body wants numbers. */
function ids(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(asId).filter((one): one is number => one !== undefined)
}
