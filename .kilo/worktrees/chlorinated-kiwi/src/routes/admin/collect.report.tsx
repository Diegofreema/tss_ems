import { createFileRoute } from '@tanstack/react-router'
import { CollectionsReportPage } from '@/portals/admin/features/collections-report/report-page'

export const Route = createFileRoute('/admin/collect/report')({
  staticData: { title: 'Collections report', crumb: 'Finance · Fee collection', crumbTo: '/admin/collect' },
  component: CollectionsReportPage,
})
