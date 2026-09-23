import type { PortalConfig } from '@/lib/portal'
import { CurrentTerm } from '@/components/layout/current-term'
import { ChildBar } from './features/children/child-bar'
import { FamilyContext } from './features/family/family-context'
import { useMyNotifications } from '@/features/notifications/use-notice-feed'
import { parentNav } from './nav'

export const parentPortal: PortalConfig = {
  role: 'parent',
  roleLabel: 'Parent',
  basePath: '/parent',
  nav: parentNav,
  useNotifications: useMyNotifications,
  notFoundAudience: 'parents',
  notFoundLinks: [
    { to: '/parent', label: 'Dashboard', hint: 'What needs you today' },
    { to: '/parent/pay', label: 'Pay fees', hint: 'Anything still owing' },
    { to: '/parent/results', label: 'Results', hint: 'This term, by child' },
    { to: '/parent/invoices', label: 'Invoices', hint: 'What is billed, and its receipt' },
  ],
  context: <FamilyContext />,
  contextBar: <ChildBar />,
  headerStatus: <CurrentTerm />,
}
