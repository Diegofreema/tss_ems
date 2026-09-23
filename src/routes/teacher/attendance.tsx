import { createFileRoute } from '@tanstack/react-router';
import { freshen } from '@/db/collection';
import { registerCollections } from '@/db/collections/attendance';
import { pageSearch } from '@/lib/search';
import { RegisterPage } from '@/portals/teacher/features/attendance/register-page';

export const Route = createFileRoute('/teacher/attendance')({
  // Which class and which day the roll is being taken for — the coverage page
  // links a missing day straight to its register.
  validateSearch: pageSearch(['arm', 'date']),
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
  staticData: { title: 'Take attendance', crumb: 'Teaching' },
  component: RegisterPage,
});
