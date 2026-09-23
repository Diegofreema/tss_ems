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
  /**
   * The section's own glyph, on the row that opens it. A heading without one
   * still renders — it simply sits where the icons are, which is what the
   * ungrouped block at the top does anyway.
   */
  icon?: LucideIcon
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
  /**
   * Where the header's search box sends what was typed. Only the office has
   * one: `GET /search` is admin-only, and the API gives a teacher, a guardian
   * or a student nothing of their own to search across.
   */
  searchPath?: string
  /**
   * Where the rail's Tools section points for settings. Defaults to the
   * portal's own profile page, which is what settings means to everybody but
   * the office.
   */
  settingsPath?: string
  /**
   * Where the header's messages button goes, for the three portals that have
   * one. The student portal sets none: the school gives a student no contacts,
   * so a button there would open a page with nobody to write to.
   */
  messagesPath?: string
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
