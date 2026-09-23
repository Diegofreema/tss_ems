import { createFileRoute } from '@tanstack/react-router'
import { AdminPerformancePage } from '@/portals/admin/features/performance/admin-performance-page'

export const Route = createFileRoute('/admin/performance')({
  staticData: { title: 'Performance', crumb: 'Academics' },
  component: AdminPerformancePage,
})
