import type {
  ClassArmSummary,
  ClassSubject,
  Department,
  DepartmentBody,
  NamedRef,
} from '../../../api/departments/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'

/** The form's values, all strings from the inputs. */
type FormValues = Record<string, unknown>

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * What a class holds, as the detail endpoint counts it. The list endpoint
 * sends none of this, so the register asks each class for its own — see the
 * note on `census` in the collection definition.
 */
export type ClassCounts = {
  arms: number
  pupils: number
  subjects: number
  /**
   * The arms by name. A class is split into JSS1 A and B — "2" is a fact
   * about the class that tells nobody which arm to go and look at.
   */
  armNames: string[]
}

/**
 * `dependencies` is the authority — it counts every pupil whose class this is,
 * including any not placed in an arm. The expanded lists are the fallback for
 * a response that carries them without the counts.
 */
export function classCounts(department: Department): ClassCounts {
  const of = (key: string, list?: unknown[]) =>
    typeof department.dependencies?.[key] === 'number'
      ? department.dependencies[key]
      : (list?.length ?? 0)

  return {
    arms: of('class_arms', department.class_arms),
    pupils: of('students'),
    subjects: of('subjects', department.subjects),
    // Only the detail expands the arms, so a class that answered with counts
    // alone is named by neither — the register reads blank, not "0".
    armNames: (department.class_arms ?? [])
      .map((arm) => arm.arm_name?.trim())
      .filter((name): name is string => Boolean(name)),
  }
}

/** The totals the tiles above the register report. */
export function census(departments: Department[]): {
  counts: Map<string, ClassCounts>
  totals: { classes: number; arms: number; pupils: number; subjects: number }
} {
  const counts = new Map<string, ClassCounts>()
  const totals = { classes: departments.length, arms: 0, pupils: 0, subjects: 0 }

  for (const department of departments) {
    const held = classCounts(department)
    counts.set(String(department.id), held)
    totals.arms += held.arms
    totals.pupils += held.pupils
    totals.subjects += held.subjects
  }

  return { counts, totals }
}

/** A count that has not been asked for yet reads blank, never as zero. */
function tally(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : BLANK
}

function names(list: NamedRef[] | undefined): string {
  return list?.map((item) => item.name).filter(Boolean).join(', ') || BLANK
}

/** A set of names as one cell. Nothing to name and nothing asked for read alike. */
function joined(list: string[] | undefined): string {
  return list?.join(', ') || BLANK
}

/**
 * A set of ids as one cell, for a form field that holds many.
 *
 * A row is all strings, so this is where the set is flattened and the form
 * splits it back. Only the detail endpoint expands these lists — the register
 * sends none of them — so a row built from the list carries an empty string,
 * which the form reads as "nothing ticked". That is why the edit form loads
 * from `record`, which fetches the detail, and never from a list row.
 */
function ids(list: { id: number }[] | undefined): string {
  return (list ?? []).map((item) => String(item.id)).join(',')
}

/**
 * One class — JSS 1, SSS II. The API's table is `departments` and the code
 * keeps that spelling so the wire and the register agree, but every word on
 * screen says class, because that is what a row is.
 */
export function classRow(department: Department, counts?: ClassCounts): Row {
  return {
    id: String(department.id),
    name: text(department.name),
    code: text(department.deptcode),
    arms: joined(counts?.armNames),
    pupils: tally(counts?.pupils),
    subjectCount: tally(counts?.subjects),

    // Not a column. The arms are shown by name; the delete warning still has
    // to count them, and `dependencies` counts arms the detail never expanded.
    armCount: tally(counts?.arms),

    // Read by the record panel rather than the table.
    fees: names(department.fees),
    terms: names(department.semesters),

    // The edit form is keyed as the endpoint is, and prefills from here.
    fee_ids: ids(department.fees),
    subject_ids: ids(department.subjects),
  }
}

/**
 * The class form as `POST /departments` wants it: the name, and the fees and
 * subjects the class carries, each as a plain array of the API's own ids.
 *
 * `deptcode` is not sent — the endpoint fills it from the name.
 *
 * Both association keys replace the whole set rather than adding to it, which
 * is what makes unticking a fee the way to stop charging it. It also means
 * these are always sent, including empty: leaving `subjects` out of an edit
 * that cleared them would silently keep the ones already there.
 */
export function classBody(values: FormValues): DepartmentBody {
  return {
    name: String(values.name ?? '').trim(),
    fees: numbers(values.fee_ids),
    subjects: numbers(values.subject_ids),
  }
}

/** The checkbox group holds the API's ids as strings; the body wants numbers. */
function numbers(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((one) => Number(one))
    .filter((one) => Number.isFinite(one) && one > 0)
}

/** The API lower-cases its statuses; the register does not. */
function titleCase(value: string | null | undefined): string {
  const word = value?.trim()
  return word ? word[0].toUpperCase() + word.slice(1) : BLANK
}

/** One line of a class's arms tab, from `GET /departments/{id}/class-arms`. */
export function classArmRow(arm: ClassArmSummary): Row {
  return {
    id: String(arm.id),
    arm: text(arm.arm_name),
    description: text(arm.description),
    teacher: text(arm.class_teacher),
    roll: String(arm.students ?? 0),
    status: titleCase(arm.status),
  }
}

/** One line of a class's subjects tab. `status` is a number on this endpoint. */
export function classSubjectRow(subject: ClassSubject): Row {
  return {
    id: String(subject.id),
    code: text(subject.subjectcode),
    name: text(subject.name),
    status: subject.status ? 'Active' : 'Inactive',
  }
}

/**
 * What deleting this class would take with it, named rather than counted in
 * the abstract. The API refuses outright while anything points at the class,
 * so this is the sentence that explains the refusal before it happens.
 */
export function classDeleteBody(row: Row | undefined): string {
  const held = [
    [row?.pupils, 'pupil', 'pupils'],
    [row?.armCount, 'arm', 'arms'],
    [row?.subjectCount, 'subject', 'subjects'],
  ]
    .map(([value, one, many]) => {
      const count = Number(value)
      return count > 0 ? `${count} ${count === 1 ? one : many}` : ''
    })
    .filter(Boolean)

  if (held.length === 0) {
    return 'Nothing belongs to this class, so removing it changes nothing else.'
  }
  return `This class still holds ${held.join(', ')}. The register will refuse to delete it until every one of them has been moved to another class.`
}
