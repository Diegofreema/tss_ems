import type {
  SetAssignment,
  TeacherClassArm,
  TeacherDashboard,
  TeacherDashboardStats,
} from '../../../../api/teaching/types.ts';
import { BLANK } from '../../../../features/collections/blank.ts';
import {
  schoolMillis,
  schoolTime,
  when,
} from '../../../../features/collections/when.ts';

/**
 * The teacher's home page, off `GET /teachers/me/dashboard`.
 *
 * The endpoint answers five counters, the assignments this teacher has set and the
 * arms they take. It has no timetable and no class averages — the two panels
 * the prototype drew from neither — so the page shows what the school actually
 * holds instead.
 */

/** Whether an assignment is still taking submissions. */
export function isOpen(assignment: SetAssignment, now: Date): boolean {
  const closes = schoolMillis(assignment.closedate);
  return closes === null || closes > now.getTime();
}

function armNames(arms: TeacherClassArm[]): string {
  return arms.map((arm) => arm.arm_name).join(', ');
}

/** A figure written as a plain count, as the tiles want it. */
function countTile(label: string, amount: number, delta: string, hot = false) {
  return { label, amount, format: 'number' as const, delta, hot };
}

/** The four counters across the top. */
export function teacherFigures(dashboard: TeacherDashboard) {
  const { stats } = dashboard;
  const arms = dashboard.class_arms;

  return [
    countTile(
      'Pupils I teach',
      stats.my_students,
      `Of ${stats.total_students} in the school`,
    ),
    countTile(
      'My subjects',
      stats.my_subjects,
      stats.my_subjects ? 'Set by the school office' : 'None assigned yet',
    ),
    countTile(
      'Classes I take',
      arms.length,
      armNames(arms) || 'Not a class teacher this session',
    ),
    countTile(
      'Assignments open',
      stats.pending_assignments,
      stats.pending_assignments
        ? 'Still taking submissions'
        : 'Nothing open just now',
      // Worth flagging only while something is actually open.
      stats.pending_assignments > 0,
    ),
  ];
}

/**
 * The line under the greeting. Attendance is the one thing on this page that
 * is a task rather than a figure, so it leads.
 */
export function teacherNote(stats: TeacherDashboardStats): string {
  const attendance = stats.attendance_taken_today
    ? 'Today’s attendance is in.'
    : 'Today’s attendance has not been taken yet.';
  const assignments = stats.pending_assignments
    ? `${stats.pending_assignments} of your assignments ${stats.pending_assignments === 1 ? 'is' : 'are'} still open.`
    : 'No assignment of yours is open.';

  return `${attendance} ${assignments}`;
}

/**
 * The assignments this teacher has set, newest first.
 *
 * The API's own `status` is left out: it reads 'active' on an assignment that shut
 * days ago, because nothing re-checks the clock when the row is written. The
 * closing time is what the list says instead, and an open one is flagged.
 */
export function assignmentEntries(assignments: SetAssignment[], now: Date) {
  return assignments.map((assignment) => {
    const open = isOpen(assignment, now);
    const questions = assignment.total_questions ?? 0;

    return {
      id: String(assignment.id),
      text: assignment.title?.trim() || `Assignment ${assignment.id}`,
      who: [
        assignment.subject?.name,
        `${questions} question${questions === 1 ? '' : 's'}`,
      ]
        .filter(Boolean)
        .join(' · '),
      when: assignment.closedate
        ? `${open ? 'Closes' : 'Closed'} ${when(schoolTime(assignment.closedate), true)}`
        : 'No closing time',
      flagged: open,
    };
  });
}

/** The arms taken, each against the class it belongs to. */
export function armRows(
  arms: TeacherClassArm[],
): { label: string; value: string }[] {
  return arms.map((arm) => ({
    label: arm.arm_name,
    value: arm.department?.name?.trim() || BLANK,
  }));
}
