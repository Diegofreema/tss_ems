import { createFileRoute } from '@tanstack/react-router'
import { AttendanceDashboard } from '@/portals/admin/features/attendance/dashboard-page'

export const Route = createFileRoute('/admin/attendance')({
  staticData: { title: 'Attendance', crumb: 'Students' },
  component: AttendanceDashboard,
})
