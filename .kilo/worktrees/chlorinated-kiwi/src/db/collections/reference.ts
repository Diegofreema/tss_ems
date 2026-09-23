import { sessionsService, termsService } from '@/api/calendar/service'
import { settingsService } from '@/api/settings/service'
import type { SchoolSettings } from '@/api/settings/types'
import type { CalendarRecord } from '@/api/calendar/types'
import { adminsService } from '@/api/admins/service'
import type { Admin } from '@/api/admins/types'
import { classArmsService } from '@/api/class-arms/service'
import type { ClassArm } from '@/api/class-arms/types'
import { collectFeesService } from '@/api/collect-fees/service'
import { departmentsService } from '@/api/departments/service'
import type { Department } from '@/api/departments/types'
import { feesService } from '@/api/fees/service'
import type { Fee } from '@/api/fees/types'
import { libraryService } from '@/api/library/service'
import type { Book } from '@/api/library/types'
import type { Loan } from '@/api/library/types'
import { noticesService } from '@/api/notifications/service'
import type { AllNoticesEnvelope } from '@/api/notifications/types'
import { parentsService } from '@/api/parents/service'
import type { Parent } from '@/api/parents/types'
import { studentsService } from '@/api/students/service'
import type { Student } from '@/api/students/types'
import { subjectsService } from '@/api/subjects/service'
import type { Subject } from '@/api/subjects/types'
import { teachersService } from '@/api/teachers/service'
import type { Teacher } from '@/api/teachers/types'
import { usersService } from '@/api/users/service'
import type { Role } from '@/api/users/types'
import { schoolCollection, schoolDocument } from '../collection'
import { ShapeError } from '../errors'
import { SET } from '../ids'
import { readSnapshot } from '../snapshot'

/**
 * The school's own reference data, on the device.
 *
 * This is what makes a **form** work without a connection, which is a bigger
 * win than any one register: a page that lists something is useful to read,
 * but a page that cannot offer the school's own classes, arms, subjects and
 * fees is a page nobody can fill in. Every `optionsFrom` feed in the app reads
 * one of these.
 *
 * All of it changes when the school is reorganised, not mid-form — which is why
 * it was already cached for five minutes on the query path and why keeping it
 * on the device costs nothing in freshness.
 *
 * These are office-wide registers rather than anybody's own record, and they
 * are only ever synced by a login the school lets read them: a teaching login
 * is refused `/departments`, `/class-arms` and `/subjects` outright, and its
 * own feeds come from `collections/teaching.ts` instead.
 */

/** Everything on one page — a school has classes and arms in the dozens. */
export const ALL = 200

/** The classes the school teaches. The API calls them departments. */
export const refClasses = schoolCollection<Department, number>({
  id: SET.refClasses,
  fetch: () => departmentsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (department) => department.id,
  schemaVersion: 1,
})

/**
 * The same classes, each asked for its own detail.
 *
 * Its own set beside `refClasses`, and deliberately: the register above the
 * classes shows how many arms, students and subjects each holds, and
 * `GET /departments` sends the row alone — there is no endpoint that counts
 * them in bulk, so this is one request per class on top of the list.
 *
 * A school's whole register is a page of a few dozen, run in parallel, and this
 * set syncs only when somebody opens the classes page. Folding it into
 * `refClasses` would put that N+1 behind every form's class dropdown instead,
 * which is most of the forms in the app.
 *
 * A class whose detail refuses keeps the counts the device already held —
 * this answer overwrites the snapshot, so falling back to the bare list row
 * used to write a countless copy over a complete one. The list's own fields
 * still win over the held detail, so a renamed class reads by its new name
 * even while its counts are the last ones the school confirmed. Only a class
 * this device never counted falls back to the list row alone.
 */
export const refClassCensus = schoolCollection<Department, number>({
  id: SET.refClassCensus,
  fetch: async () => {
    const { items } = await departmentsService.list({ limit: ALL })
    const held = new Map(
      (readSnapshot<Department>(SET.refClassCensus) ?? []).map((department) => [
        department.id,
        department,
      ]),
    )
    return Promise.all(
      items.map((department) =>
        departmentsService
          .get(department.id)
          .catch((): Department => ({ ...(held.get(department.id) ?? {}), ...department })),
      ),
    )
  },
  getKey: (department) => department.id,
  schemaVersion: 1,
})

/**
 * Every arm in the school, each carrying the class it belongs to.
 *
 * One set rather than one per class. `class-arms/for-department/{id}` cannot be
 * a collection — it is a different answer per class, and a collection is one
 * set — but it does not need to be: an arm carries `department_id`, so the
 * narrowed feed a form asks for is this set filtered, and it is filtered
 * without a request.
 */
export const refArms = schoolCollection<ClassArm, number>({
  id: SET.refArms,
  fetch: () => classArmsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (arm) => arm.id,
  schemaVersion: 1,
})

/**
 * Every subject, withdrawn ones included.
 *
 * The register keeps a withdrawn subject so old results still read, and the
 * feeds that offer subjects filter it out themselves — which they can only do
 * if it is here to filter. A set narrowed at the fetch cannot be widened later
 * without a second request.
 */
export const refSubjects = schoolCollection<Subject, number>({
  id: SET.refSubjects,
  fetch: () => subjectsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (subject) => subject.id,
  schemaVersion: 1,
})

/** Every fee, retired ones included, for the same reason as the subjects. */
export const refFees = schoolCollection<Fee, number>({
  id: SET.refFees,
  fetch: () => feesService.list({ limit: ALL }).then((page) => page.items),
  getKey: (fee) => fee.id,
  schemaVersion: 1,
})

/** The school years on record. */
export const refSessions = schoolCollection<CalendarRecord, number>({
  id: SET.refSessions,
  fetch: () => sessionsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (session) => session.id,
  schemaVersion: 1,
})

/**
 * The one settings row — who the school is on every document, and the session
 * and term it is in. The header of every admin page reads the calendar off
 * it, and the settings form fills from it; restricted to administrators, like
 * the rest of this file.
 */
export const refSettings = schoolDocument<SchoolSettings>({
  id: SET.refSettings,
  fetch: () => settingsService.get(),
  schemaVersion: 1,
})

/** First, Second and Third Term. The API's table calls them semesters. */
export const refTerms = schoolCollection<CalendarRecord, number>({
  id: SET.refTerms,
  fetch: () => termsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (term) => term.id,
  schemaVersion: 1,
})

/** What kind of login an account is — Super Admin, Bursar, Secretary. */
export const refRoles = schoolCollection<Role, number>({
  id: SET.refRoles,
  fetch: () => usersService.roles(),
  getKey: (role) => role.id,
  schemaVersion: 1,
})

/**
 * The ways the school takes money at the counter.
 *
 * A document rather than a list: the endpoint answers with an object keyed by
 * the value the API expects — `{cash: "Cash", ...}` — so there is no row and no
 * id, and the keys are the answer.
 */
export const refMethods = schoolDocument<Record<string, string>>({
  id: SET.refMethods,
  fetch: () => collectFeesService.paymentMethods(),
  schemaVersion: 1,
})

/** The whole catalogue. The endpoint ignores paging and answers whole. */
export const refBooks = schoolCollection<Book, number>({
  id: SET.refBooks,
  fetch: () => libraryService.books(),
  getKey: (book) => book.id,
  schemaVersion: 1,
})

/**
 * The office records — the principal, the bursary, the heads of section.
 *
 * A school has these in single figures, and `GET /admins` takes no search
 * parameter at all, so the whole register is one page whether it is read here
 * or over the wire.
 */
export const refAdmins = schoolCollection<Admin, number>({
  id: SET.refAdmins,
  fetch: () => adminsService.list({ limit: ALL }).then((page) => page.items),
  getKey: (admin) => admin.id,
  schemaVersion: 1,
})

/** The teaching staff, for the forms that put somebody in front of a class. */
export const refTeachers = schoolCollection<Teacher, number>({
  id: SET.refTeachers,
  fetch: () => teachersService.list({ limit: ALL }).then((page) => page.items),
  getKey: (teacher) => teacher.id,
  schemaVersion: 1,
})

/**
 * How many students a school on this deployment is expected to hold.
 *
 * Higher than the `ALL` above, because this is the one register that scales
 * with the school rather than with how it is organised. Hundreds is the size
 * this was built for; a school in the thousands wants the register paged at the
 * endpoint again, and this constant is where that decision shows up.
 */
export const A_SCHOOL = 500

/**
 * Every student, whatever stage of admission they are at.
 *
 * Unfiltered on purpose. The office's register filters by admission and by
 * enrolment, the applicants list is the same set narrowed to one of them, and
 * the forms' picker wants the admitted alone — a set narrowed at the fetch
 * could serve only the last of those, and could not be widened without a second
 * request there may be no connection to make.
 */
export const refStudents = schoolCollection<Student, number>({
  id: SET.refStudents,
  fetch: () => studentsService.list({ limit: A_SCHOOL }).then((page) => page.items),
  getKey: (student) => student.id,
  schemaVersion: 1,
})

/**
 * The household register, off `sparents` — the same endpoint the office's own
 * list reads, so the rows carry what its columns show.
 *
 * Its own set beside `refGuardians`, which is the `admins/parents` directory:
 * two endpoints over the same households, answering with different fields.
 * The directory names a household for a picker and carries the two occupations;
 * this one carries the phone, the email and whether the sign-in is active.
 */
export const refParents = schoolCollection<Parent, number>({
  id: SET.refParents,
  fetch: () => parentsService.list({ limit: A_SCHOOL }).then((page) => page.items),
  getKey: (parent) => parent.id,
  schemaVersion: 1,
})

/** The guardian directory, which the household forms search. */
export const refGuardians = schoolCollection<Parent, number>({
  id: SET.refGuardians,
  fetch: () => parentsService.directory(),
  getKey: (parent) => parent.id,
  schemaVersion: 1,
})

/**
 * The school notice board, whole — the notices *and* the audience catalogue,
 * which is a sibling of the list, not an endpoint of its own.
 *
 * One document rather than the two sets it used to be: the board and the
 * catalogue came off the same `GET /notifications` answer fetched twice, two
 * requests whose snapshots could disagree — and each kept its field with a
 * `?? []` that read a renamed field as a successful empty answer and wiped
 * the device's copy with it. Kept whole, the notice form offers exactly the
 * audiences the board itself published beside the posts.
 *
 * Deliberately **not** read through `GET /notifications/{id}` anywhere: that
 * endpoint marks a notice read and counts a view every time it is asked, so
 * opening the office's own record would inflate the tally the office is
 * reading. Every field the record shows is on the list.
 */
export const refBoard = schoolDocument<AllNoticesEnvelope>({
  id: SET.refBoard,
  fetch: async () => {
    const board = await noticesService.all({ limit: ALL })
    // The guard `schoolCollection` gives a list, done by hand for the field a
    // document keeps it in: an answer without the posts is a shape change,
    // not an empty school, and must not become the stored copy.
    if (!Array.isArray(board.notifications)) throw new ShapeError(SET.refBoard)
    return board
  },
  schemaVersion: 1,
})

/** Every borrowing on record — issue, return, fines and corrections. */
export const refLoans = schoolCollection<Loan, number>({
  id: SET.refLoans,
  fetch: () => libraryService.loans(),
  getKey: (loan) => loan.id,
  schemaVersion: 1,
})

/**
 * What an office form needs before it can be filled in at all.
 *
 * Readied by the admin shell so a form opened later, with no connection, still
 * has the school's own classes, arms, subjects, fees and calendar to offer.
 * The heavier directories — staff, students, guardians, the catalogue — are left
 * to sync when a feed actually asks for one.
 */
export const referenceCollections = [
  refClasses,
  refArms,
  refSubjects,
  refFees,
  refSessions,
  refTerms,
  // One row, and the header of every admin page reads the calendar off it.
  refSettings,
  // The board and its audience catalogue in one document. The office's bell
  // is built on it, and the notice form cannot be completed without it:
  // `recipients` is required, and its choices are the catalogue the board
  // publishes beside its own posts.
  refBoard,
]
