import type { StaffDepartment } from '../../api/teachers/types.ts'

/** A class as the teacher's own feed offers it. */
export type ClassChoice = { id: number; name: string; code: string }

/*
 * Asked for structurally rather than by name: the two sets this reads carry
 * different arm types (`TeacherArm` off the staff record, `TeacherClassArm`
 * off the teaching one) and the only field either is read for is the class
 * expanded on it. Naming one of them would tie this rule to whichever
 * collection happened to be passed first.
 */

/** Enough of a subject to place it: its id, and the class it is taught in. */
export type PlacedSubject = { id: number; department?: StaffDepartment | null }

/** Enough of an arm to name the class it belongs to. */
export type PlacedArm = { department?: StaffDepartment | null }

/**
 * The classes a teaching login may set work for, optionally narrowed to the
 * one class a chosen subject is taught in.
 *
 * **A subject belongs to exactly one class.** `/teachers/me/subjects` carries
 * `department_id` on every subject and expands the class beside it, so the
 * class a subject is sat by is already on the device — no endpoint is needed
 * to narrow this, and there is no endpoint that would: a teaching login can
 * read neither `/departments` nor `/subjects`, both of which answer
 * "restricted to administrators".
 *
 * Unnarrowed, the list is what the teacher's own record names: the class
 * behind every subject they were given, and behind every arm they take. A
 * teacher given neither is offered nothing, which is the truth — the office
 * has not put them in front of a class yet.
 *
 * **A subject whose class cannot be read narrows nothing.** If the chosen
 * subject is not on the device, or the school sent it without its class
 * expanded, the whole list is offered rather than an empty one: the same call
 * the lending picker makes, where a figure that cannot be read means the row
 * is offered and the endpoint gets to refuse it. An empty required dropdown is
 * a form nobody can finish, which is worse than a list holding one class too
 * many.
 */
export function myClasses(
  subjects: readonly PlacedSubject[],
  arms: readonly PlacedArm[],
  /** The chosen subject's id, as the form holds it. Empty narrows nothing. */
  subjectId = '',
): ClassChoice[] {
  const chosen = subjectId
    ? subjects.find((subject) => String(subject.id) === subjectId.trim())
    : undefined

  const departments: (StaffDepartment | null | undefined)[] =
    chosen?.department
      ? [chosen.department]
      : [
          ...subjects.map((subject) => subject.department),
          ...arms.map((arm) => arm.department),
        ]

  const classes = new Map<number, ClassChoice>()
  for (const one of departments) {
    if (one) classes.set(one.id, { id: one.id, name: one.name, code: one.deptcode ?? '' })
  }
  return [...classes.values()]
}
