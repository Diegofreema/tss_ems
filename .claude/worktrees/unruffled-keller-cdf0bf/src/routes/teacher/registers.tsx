import { createFileRoute } from '@tanstack/react-router';
import { CoveragePage } from '@/portals/teacher/features/attendance/coverage-page';

export const Route = createFileRoute('/teacher/registers')({
  staticData: { title: 'Registers taken', crumb: 'Teaching' },
  component: CoveragePage,
});
