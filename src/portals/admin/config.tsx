import type { PortalConfig } from '@/lib/portal'
import { CurrentTerm } from '@/components/layout/current-term'
import { useOfficeMayOpen } from '@/features/auth/access'
import { closedBecause } from '@/features/auth/privileges'
import { useOfficeNotifications } from '@/features/notifications/use-notice-feed'
import { adminNav } from './nav'

export const adminPortal: PortalConfig = {
  role: 'admin',
  roleLabel: 'Bronze · Admin',
  basePath: '/admin',
  messagesPath: '/admin/messages',
  nav: adminNav,
  context: <CurrentTerm />,
  searchPath: '/admin/search',
  settingsPath: '/admin/settings',
  useNotifications: useOfficeNotifications,
  useMayOpen: useOfficeMayOpen,
  closedBecause: (path) => closedBecause(path),
  notFoundAudience: 'the office',
  notFoundLinks: [
    { to: '/admin', label: 'Dashboard', hint: 'Money and people at a glance' },
    { to: '/admin/collect', label: 'Fee collection', hint: 'Outstanding invoices' },
    { to: '/admin/students', label: 'Student register', hint: 'Every student on file' },
    { to: '/admin/logs', label: 'Activity log', hint: 'Who did what' },
  ],
}
