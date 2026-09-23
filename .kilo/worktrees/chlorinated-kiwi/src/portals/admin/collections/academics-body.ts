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
export function subjectBody(values: FormValues): SubjectBody {
  return {
    name: text(values.name),
    department_id: asId(values.department_id),
    teachers: ids(values.teacher_ids),
  }
}

/** A checkbox group holds the API's ids as strings; a body wants numbers. */
function ids(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(asId).filter((one): one is number => one !== undefined)
}
