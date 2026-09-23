import { createFileRoute } from '@tanstack/react-router'
import { ParentPerformancePage } from '@/portals/parent/features/performance/parent-performance-page'

export const Route = createFileRoute('/parent/performance')({
  staticData: { title: 'Progress', crumb: 'My children' },
  component: ParentPerformancePage,
})
