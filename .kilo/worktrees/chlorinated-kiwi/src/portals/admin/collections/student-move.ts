import type { AssignStudentsBody } from '../../../api/class-arms/types.ts'
import type { PromoteStudentsBody } from '../../../api/students/types.ts'

export type MoveValues = {
  picks: string[]
  department_id: string
  class_arm_id: string
}

/**
 * Where the students are now, so the move can tell which kind it is.
 */
export type MoveFrom = { departmentId: string }

export type Move =
  | { kind: 'promote'; body: PromoteStudentsBody }
  | { kind: 'transfer'; armId: number; body: AssignStudentsBody }

function ids(picks: string[]): number[] {
  return picks.map(Number).filter((id) => Number.isFinite(id) && id > 0)
}

/**
 * Which of the two moves the school is asking for.
 *
 * Staying in the class and changing arm is a transfer, and goes to the arm's
 * own endpoint — that one judges each student separately and reports who it
 * refused, which matters when a parent asks why their child did not move.
 * Changing class is a promotion, and goes out as one batch.
 */
export function studentMove(values: MoveValues, from: MoveFrom): Move {
  const student_ids = ids(values.picks)
  const department = Number(values.department_id)
  const arm = Number(values.class_arm_id)

  if (values.department_id === from.departmentId) {
    return { kind: 'transfer', armId: arm, body: { student_ids } }
  }

  return {
    kind: 'promote',
    body: {
      student_ids,
      department_id: department,
      class_arm_id: Number.isFinite(arm) && arm > 0 ? arm : undefined,
    },
  }
}

/** What the school is told once the API has answered. */
export function moveOutcome(
  move: Move,
  result: { assigned?: number[]; failed?: { student_id: number; reason: string }[] } | undefined,
  nameFor: (id: number) => string,
): { message: string; failures: string[] } {
  const failed = result?.failed ?? []
  // The arm endpoint says exactly who it took; promote answers with nothing,
  // so everyone it did not refuse is counted as moved.
  const moved =
    move.kind === 'transfer'
      ? (result?.assigned?.length ?? 0)
      : move.body.student_ids.length - failed.length

  return {
    message: `${moved} ${moved === 1 ? 'student' : 'students'} moved`,
    failures: failed.map((one) => `${nameFor(one.student_id)} — ${one.reason}`),
  }
}
