import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '@/portals/parent/features/attendance/attendance-page'
import { useSelectedChild } from '@/portals/parent/parent.store'

export const Route = createFileRoute('/parent/attendance')({
  staticData: { title: 'Attendance', crumb: 'My children' },
  component: Attendance,
})

function Attendance() {
  return <AttendancePage child={useSelectedChild()} />
}
