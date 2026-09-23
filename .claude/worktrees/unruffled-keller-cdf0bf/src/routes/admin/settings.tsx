import { createFileRoute } from '@tanstack/react-router'
import { SettingsForm } from '@/portals/admin/features/settings/settings-form'

export const Route = createFileRoute('/admin/settings')({
  staticData: { title: 'Settings', crumb: 'School' },
  component: SettingsForm,
})
