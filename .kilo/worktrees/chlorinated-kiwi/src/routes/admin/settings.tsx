import { createFileRoute } from '@tanstack/react-router'
import { freshen } from '@/db/collection'
import { refSettings } from '@/db/collections/reference'
import { SettingsForm } from '@/portals/admin/features/settings/settings-form'

export const Route = createFileRoute('/admin/settings')({
  staticData: { title: 'Settings', crumb: 'School' },
  // The school's own row — which session and term are current, and the term's
  // dates. It is one setting for the whole school and every other machine in
  // the office can change it, so opening the form on a stale copy is opening
  // it on somebody else's about-to-be-overwritten answer.
  loader: () => freshen([refSettings]),
  component: SettingsForm,
})
