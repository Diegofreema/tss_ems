import { createFileRoute } from '@tanstack/react-router';
import { freshen } from '@/db/collection';
import { registerCollections } from '@/db/collections/attendance';
import { CoveragePage } from '@/portals/teacher/features/attendance/coverage-page';

export const Route = createFileRoute('/teacher/registers')({
  /**
   * The arms, the school's words for a mark and the days themselves, readied
   * before the page draws. Only the readying is waited for, and its failure is
   * swallowed: a device that already holds them opens on them, and one that
   * does not says so on the page rather than in an error boundary.
   *
   * And asked for again on the way in. A register is the page most likely to
   * have been written by somebody else since this device last synced — a
   * second teacher marking the same arm, the office correcting a day — and a
   * roll drawn from a stale copy is a roll that quietly disagrees with the
   * school's.
   */
  loader: () => freshen(registerCollections),
  staticData: { title: 'Attendance timeline', crumb: 'Teaching' },
  component: CoveragePage,
});
