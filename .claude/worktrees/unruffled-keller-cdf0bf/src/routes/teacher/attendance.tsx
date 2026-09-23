import { createFileRoute } from '@tanstack/react-router';
import { RegisterPage } from '@/portals/teacher/features/attendance/register-page';

export const Route = createFileRoute('/teacher/attendance')({
  staticData: { title: 'Take attendance', crumb: 'Teaching' },
  component: RegisterPage,
});
