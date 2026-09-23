import type {
  EClass,
  TeacherResult,
  TeacherStudent,
  TeacherSubject,
  Topic,
} from '../../../api/teaching/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import { birthday } from '../../../features/collections/birthday.ts'
import { mark } from '../../../features/collections/mark.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/** Joins the parts a record actually carries, e.g. "Mr O. Udoye · 0803 441 2280". */
function joined(...parts: (string | null | undefined)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ') || BLANK
}

/**
 * One subject the office has given this teacher.
 *
 * `status` is a number on this endpoint: 1 while the subject is offered, 0
 * once it has been withdrawn from the timetable. The class is the subject's
 * own home class, not the arms it is taught in — nothing here says that.
 */
export function mySubjectRow(subject: TeacherSubject): Row {
  return {
    id: String(subject.id),
    code: text(subject.subjectcode),
    name: text(subject.name),
    klass: text(subject.department?.name),
    status: subject.status === 1 ? 'Active' : 'Inactive',

    // Read by the record panel rather than the table.
    added: when(subject._joinData?.created_date),
  }
}

/**
 * A pupil on the roll.
 *
 * `status` is where they are in admission — every pupil on a roll reads
 * "Admitted" — and `studentstatus` is the one that says Active or Suspended,
 * so whichever of the two the school has filled in is what the column shows.
 */
export function pupilRow(student: TeacherStudent): Row {
  return {
    id: String(student.id),
    adm: text(student.regno ?? student.application_no),
    name: text([student.fname, student.mname, student.lname].filter(Boolean).join(' ')),
    arm: text(student.class_arm?.arm_name),
    klass: text(student.department?.name),
    status: text(student.studentstatus ?? student.status),

    // Everything below is read by the record panel rather than the table.
    gender: text(student.gender),
    // Both spellings reach here — DD/MM/YYYY off the school's older records
    // and YYYY-MM-DD off the ones this app enrolled — so it is read through
    // the same function the office's register uses.
    born: birthday(student.dob),
    email: text(student.email),
    phone: text(student.phone),
    address: text(student.address),
    // What the pupil record itself holds; the linked household has no name on it.
    father: joined(student.fathersname, student.fatherphone),
    mother: joined(student.mothersname, student.motherphone),
    enrolled: when(student.joindate),
    username: text(student.user?.username),
  }
}

/**
 * One mark, on the pupil's own page. The subject arrives as an id, so the
 * teacher's subject list is what names it; a mark against a subject not on
 * that list is still shown, by its id, rather than dropped.
 */
export function scoreRow(
  result: TeacherResult,
  subjects: ReadonlyMap<string, string>,
): Row {
  return {
    id: String(result.id),
    subject: subjects.get(String(result.subject_id)) ?? `Subject ${result.subject_id}`,
    ca: mark(result.ca),
    exam: mark(result.score),
    total: mark(result.total),
    grade: text(result.grade),
    // 'pending' until the office approves the batch the mark arrived in.
    state: text(result.approval_status && capitalised(result.approval_status)),
  }
}

function capitalised(word: string): string {
  const trimmed = word.trim()
  return trimmed ? trimmed[0].toUpperCase() + trimmed.slice(1) : trimmed
}

/** Subject id to name, for the marks that carry only the id. */
export function subjectNames(subjects: TeacherSubject[]): ReadonlyMap<string, string> {
  return new Map(subjects.map((subject) => [String(subject.id), text(subject.name)]))
}

/**
 * One topic covered, as the office reads it back. The subject arrives as an id
 * alone, so the teacher's own subject list is what names it.
 */
export function topicRow(topic: Topic, subjects: ReadonlyMap<string, string>): Row {
  return {
    id: String(topic.id),
    title: text(topic.title),
    subject: subjects.get(String(topic.subject_id)) ?? `Subject ${topic.subject_id}`,
    contents: text(topic.contents),

    // The edit form prefills from here and is keyed as the endpoint is.
    subject_id: String(topic.subject_id),
  }
}

/** The room a meeting link ends in — the only name an e-class has. */
export function roomOf(link: string | null | undefined): string {
  const room = link?.trim().split('/').filter(Boolean).at(-1)
  return room || BLANK
}

/**
 * One online session. The endpoint sends the link, the teacher and the day it
 * was made and nothing else — no title, no arm, no time — so the room the link
 * ends in is what names it.
 */
export function eclassRow(eclass: EClass): Row {
  return {
    id: String(eclass.id),
    room: roomOf(eclass.meetinglink),
    link: text(eclass.meetinglink),
    created: when(eclass.datecreated, true),
  }
}

/**
 * The three exam sittings, where the school recorded them separately.
 *
 * A mark uploaded from a spreadsheet is summed from three columns, so this is
 * what explains a stored exam score above the 60 the score sheet accepts. A
 * mark typed in by hand has all three at zero and reads blank rather than as
 * "0 · 0 · 0".
 */
function examParts(result: TeacherResult): string {
  const parts = [result.first_exam, result.second_exam, result.third_exam].map(Number)
  if (!parts.some((part) => Number.isFinite(part) && part > 0)) return BLANK
  return parts.map((part) => (Number.isFinite(part) ? String(part) : '0')).join(' · ')
}

/**
 * One mark in the register a teacher browses.
 *
 * Everything is read off the mark itself: the subject, the class and the pupil
 * all arrive expanded beside it, so this needs neither the roll nor the
 * subject list. The arm does not — only its id is sent, and an id is no use to
 * anybody — so the class the mark was filed under is what the row names.
 */
export function markRow(result: TeacherResult): Row {
  const pupil = result.student
  return {
    id: String(result.id),
    name: text(
      [pupil?.fname, pupil?.mname, pupil?.lname].filter(Boolean).join(' '),
    ),
    subject: result.subject?.name?.trim() || `Subject ${result.subject_id}`,
    klass: text(result.department?.name),
    ca: mark(result.ca),
    // `score` is the exam mark; `total` is it plus the CA, worked out by the
    // school rather than here.
    exam: mark(result.score),
    total: mark(result.total),
    grade: text(result.grade),
    // 'pending' until the office approves the batch the mark arrived in.
    state: text(result.approval_status && capitalised(result.approval_status)),

    // Everything below is read by the record panel rather than the table.
    adm: text(result.regno ?? pupil?.regno),
    term: joined(result.semester?.name, result.session?.name),
    exams: examParts(result),
    remark: text(result.remark),
    filed: when(result.uploaddate, true),
    // A name, so the parts are spaced rather than run through `joined`, which
    // separates two different facts with a middle dot.
    by: text([result.user?.fname, result.user?.lname].filter(Boolean).join(' ')),
  }
}
