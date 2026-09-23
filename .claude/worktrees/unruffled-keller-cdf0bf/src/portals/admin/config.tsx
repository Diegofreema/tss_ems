import type { PortalConfig } from '@/lib/portal'
import { CurrentTerm } from '@/components/layout/current-term'
import { useOfficeNotifications } from '@/features/notifications/use-notice-feed'
import { adminNav } from './nav'

export const adminPortal: PortalConfig = {
  role: 'admin',
  roleLabel: 'Bronze · Admin',
  basePath: '/admin',
  nav: adminNav,
  searchableNav: true,
  useNotifications: useOfficeNotifications,
  notFoundAudience: 'the office',
  notFoundLinks: [
    { to: '/admin', label: 'Dashboard', hint: 'Money and people at a glance' },
    { to: '/admin/collect', label: 'Fee collection', hint: 'Outstanding invoices' },
    { to: '/admin/students', label: 'Student register', hint: 'Every pupil on file' },
    { to: '/admin/logs', label: 'Activity log', hint: 'Who did what' },
  ],
  headerStatus: <CurrentTerm />,
}
