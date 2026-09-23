import { createFileRoute } from '@tanstack/react-router'
import { ClassSheetPage } from '@/portals/admin/features/results/sheet-page'

export const Route = createFileRoute('/admin/class-sheet')({
  staticData: { title: 'Class broadsheet', crumb: 'Academics' },
  component: ClassSheetPage,
})
