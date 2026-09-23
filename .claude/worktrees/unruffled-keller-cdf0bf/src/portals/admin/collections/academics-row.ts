import type { ClassArm } from '../../../api/class-arms/types.ts'
import type { Student } from '../../../api/students/types.ts'
import type { Subject, SubjectClass } from '../../../api/subjects/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** A foreign key as a select's value. A missing or zero id is no choice at all. */
function id(value: number | null | undefined): string {
  return value ? String(value) : ''
}

/** The API lower-cases its statuses; the register does not. */
export function titleCase(value: string | null | undefined): string {
  const word = value?.trim()
  return word ? word[0].toUpperCase() + word.slice(1) : BLANK
}

/**
 * One class arm — a teachable group inside a class.
 *
 * Both the list and the detail expand the class and the form teacher beside
 * their ids, so nothing here reads a name feed. The roll is the one field the
 * two responses disagree about: the list sends `students`, the detail sends
 * null there and puts the count in `dependencies` instead.
 */
export function armRow(arm: ClassArm): Row {
  const roll = arm.dependencies?.students ?? arm.students

  return {
    id: String(arm.id),
    arm: text(arm.arm_name),
    klass: text(arm.department),
    teacher: text(arm.class_teacher),
    roll: typeof roll === 'number' ? String(roll) : BLANK,
    status: titleCase(arm.status),

    // Read by the record panel rather than the table.
    description: text(arm.arm_description),
    results: countOf(arm, 'results'),
    attendance: countOf(arm, 'attendances'),

    // The edit form is keyed as the endpoint is, and prefills from here.
    arm_name: arm.arm_name ?? '',
    arm_description: arm.arm_description ?? '',
    department_id: id(arm.department_id),
    class_teacher_id: id(arm.class_teacher_id),
    // Title-cased, because that is how the form's options are spelled and a
    // value that matches none of them prefills as no choice at all. The body
    // builder lower-cases it again on the way back out.
    armstatus: arm.status ? titleCase(arm.status) : '',
  }
}

/** A dependency count, blank on a response that does not carry them. */
function countOf(arm: ClassArm, key: string): string {
  const count = arm.dependencies?.[key]
  return typeof count === 'number' ? String(count) : BLANK
}

/**
 * What deleting this arm would strand. The endpoint refuses with 409 while
 * anything points at it, so the dialog says what before the button is pressed.
 */
export function armDeleteBody(row: Row | undefined): string {
  const held = [
    [row?.roll, 'pupil', 'pupils'],
    [row?.results, 'result', 'results'],
    [row?.attendance, 'attendance record', 'attendance records'],
  ]
    .map(([value, one, many]) => {
      const count = Number(value)
      return count > 0 ? `${count} ${count === 1 ? one : many}` : ''
    })
    .filter(Boolean)

  if (held.length === 0) {
    return 'Nothing points at this arm, so removing it strands nothing.'
  }
  return `This arm still holds ${held.join(', ')}. The register will refuse to delete it until each has been moved to another arm — archive it instead to take it out of use without losing what it holds.`
}

/** The API spells a subject's status as a number rather than a word. */
export function subjectStatus(status: number | null | undefined): string {
  return status ? 'Active' : 'Inactive'
}

/**
 * One subject.
 *
 * `department` is its home class — the one it can never stop being taught to.
 * `classes` and `teachers` are expanded by the detail endpoint only; the list
 * sends neither, so both read blank on the register rather than as zero.
 */
export function subjectRow(subject: Subject): Row {
  const teachers = subject.teachers
  const classes = subject.classes

  return {
    id: String(subject.id),
    code: text(subject.subjectcode),
    name: text(subject.name),
    klass: text(subject.department),
    status: subjectStatus(subject.status),

    // Read by the record panel rather than the table.
    staff: teachers ? names(teachers.map((teacher) => teacher.name)) : BLANK,
    taught: classes ? names(classes.map((klass) => klass.name)) : BLANK,
    term: text(subject.semester),
    level: text(subject.level),
    // Kept off the panel; read by the flow so the classes already taught
    // arrive ticked, and by the delete confirm.
    classIds: (classes ?? []).map((klass) => String(klass.id)).join(','),
    results: String(subject.dependencies?.results ?? ''),
    materials: String(subject.dependencies?.coursematerials ?? ''),
    topics: String(subject.dependencies?.topics ?? ''),
    assignments: String(subject.dependencies?.setassignments ?? ''),

    // The edit form is keyed as the endpoint is, and prefills from here.
    department_id: id(subject.department_id),
    // Only the detail expands the teachers, so a row off the list ticks none.
    // That is why the edit form loads `record` and never a list row: saving
    // one would take every teacher off the subject.
    teacher_ids: (teachers ?? []).map((teacher) => String(teacher.id)).join(','),
  }
}

function names(list: string[]): string {
  return list.filter(Boolean).join(', ') || BLANK
}

/** What deleting this subject would strand, from the counts the detail sends. */
export function subjectDeleteBody(row: Row | undefined): string {
  const held = [
    [row?.results, 'result', 'results'],
    [row?.materials, 'material', 'materials'],
    [row?.topics, 'topic', 'topics'],
    [row?.assignments, 'assignment', 'assignments'],
  ]
    .map(([value, one, many]) => {
      const count = Number(value)
      return count > 0 ? `${count} ${count === 1 ? one : many}` : ''
    })
    .filter(Boolean)

  if (held.length === 0) {
    return 'Nothing has been recorded against this subject, so removing it strands nothing.'
  }
  return `This subject still carries ${held.join(', ')}. The register will refuse to delete it — withdraw it instead to stop it being offered while what it holds stays readable.`
}

/**
 * The row action on the subject register. `status` is the only thing it turns,
 * and the button offers whichever state the subject is not in.
 */
export const withdrawAction = {
  label: (row: Row) => (row.status === 'Active' ? 'Withdraw' : 'Offer again'),
  // Only one direction is asked about: putting a subject back on the
  // timetable takes nothing away.
  confirm: (row: Row) =>
    row.status === 'Active'
      ? 'It stops being offered to any class. Results, materials and topics already recorded against it stay exactly as they are.'
      : undefined,
  done: (row: Row) =>
    row.status === 'Active' ? `${row.name} withdrawn` : `${row.name} is offered again`,
}

/** One line of a subject's classes tab, with the home class marked. */
export function subjectClassRow(klass: SubjectClass): Row {
  return {
    id: String(klass.id),
    name: text(klass.name),
    role: klass.is_home ? 'Home class' : 'Also taught',
  }
}

/**
 * One line of an arm's pupils tab, from `GET /class-arms/{id}/students`. That
 * endpoint answers with two lists — who is in the arm, and who is admitted
 * into the class but not yet placed anywhere. Both belong on the page, so the
 * row says which it is rather than reading as one roll of pupils who are here.
 */
export function armPupilRow(student: Student, placed: boolean): Row {
  return {
    id: String(student.id),
    name: text([student.fname, student.mname, student.lname].filter(Boolean).join(' ')),
    adm: text(student.regno ?? student.application_no),
    placed: placed ? 'In this arm' : 'Not placed',
    status: text(student.studentstatus ?? student.status),
  }
}

/** One line of a subject's teachers tab. The API sends one joined name. */
export function subjectTeacherRow(teacher: { id: number; name: string }): Row {
  return { id: String(teacher.id), name: text(teacher.name) }
}
