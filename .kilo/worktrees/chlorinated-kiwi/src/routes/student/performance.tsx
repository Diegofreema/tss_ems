import { createFileRoute } from '@tanstack/react-router'
import { StudentPerformancePage } from '@/portals/student/features/performance/student-performance-page'

export const Route = createFileRoute('/student/performance')({
  staticData: { title: 'My progress', crumb: 'My schooling' },
  component: StudentPerformancePage,
})
