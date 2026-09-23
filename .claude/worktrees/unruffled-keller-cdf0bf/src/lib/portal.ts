import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { NotFoundLink } from '@/components/feedback/not-found-state'
import type { Notification } from '@/features/notifications/types'

export type PortalRole = 'admin' | 'teacher' | 'student' | 'parent'

export type NavItem = {
  /** Absolute route path, e.g. `/admin/students`. */
  to: string
  label: string
  icon: LucideIcon
  badge?: string
}

export type NavGroup = {
  /** Omitted for the ungrouped block at the top of the sidebar. */
  heading?: string
  items: NavItem[]
}

/**
 * Everything the shell needs to render a portal. Adding a portal means adding
 * one of these — the shell itself never learns about roles.
 */
export type PortalConfig = {
  role: PortalRole
  /** Sits under the brand mark, e.g. "Bronze · Admin". */
  roleLabel: string
  basePath: string
  nav: NavGroup[]
  /** Sidebar block between the brand and the nav. */
  context?: ReactNode
  /** Strip under the header — the parent portal's child switcher. */
  contextBar?: ReactNode
  /** Right-hand status text in the header. */
  headerStatus?: ReactNode
  /** Admin filters its long nav with a search box; the others do not. */
  searchableNav?: boolean
  /**
   * Read as a hook, because a portal on live data has to ask for its feed and
   * a portal still on a fixture can hand one back without asking. The shell
   * calls it once per render and knows the difference nowhere.
   */
  useNotifications: () => Notification[]
  /** Where the in-shell 404 points; the design tailors these per role. */
  notFoundLinks: NotFoundLink[]
  /** Who "usually wants" those links, e.g. "teachers". */
  notFoundAudience: string
}
