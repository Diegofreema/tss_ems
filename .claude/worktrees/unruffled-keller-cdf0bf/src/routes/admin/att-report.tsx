import { createFileRoute } from '@tanstack/react-router'
import { AttendanceReportPage } from '@/portals/admin/features/attendance/report-page'

export const Route = createFileRoute('/admin/att-report')({
  staticData: { title: 'Attendance report', crumb: 'Students' },
  component: AttendanceReportPage,
})
