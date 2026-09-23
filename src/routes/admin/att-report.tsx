import { createFileRoute } from '@tanstack/react-router'
import { pageSearch } from '@/lib/search'
import { AttendanceReportPage } from '@/portals/admin/features/attendance/report-page'

export const Route = createFileRoute('/admin/att-report')({
  // The report's own filters, all six of them: the day's dashboard links here
  // with the day it answered for on both ends of the range.
  validateSearch: pageSearch(['start', 'end', 'klass', 'arm', 'status', 'page']),
  staticData: { title: 'Attendance report', crumb: 'Students' },
  component: AttendanceReportPage,
})
