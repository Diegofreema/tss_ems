import { createFileRoute } from '@tanstack/react-router'
import { AdminAnalyticsPage } from '@/portals/admin/features/analytics/analytics-page'

export const Route = createFileRoute('/admin/analytics')({
  staticData: { title: 'Analytics', crumb: 'Finance' },
  component: AdminAnalyticsPage,
})
