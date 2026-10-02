import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DeniedState } from '@/components/feedback/denied-state'
import { useAccess } from '@/features/auth/access'
import { closedBecause, mayOpen } from '@/features/auth/privileges'
import { navLabel } from '@/lib/portal'
import { adminPortal } from '@/portals/admin/config'

/**
 * Where the office's shell sends an address this account may not open.
 *
 * A page of its own rather than a state drawn over the one asked for, because
 * the point is that the one asked for never loads: its loader would ask the
 * school for a register this account was not granted and write the answer
 * onto the device, behind a screen saying it cannot be opened. The shell's
 * `beforeLoad` redirects before any child's loader runs, and replaces the
 * history entry, so Back goes to where the person was rather than bouncing
 * off the closed address again.
 *
 * `from` is the address as it was asked for, query and all, so that if the
 * privilege arrives while this is on screen — the kept copy is refreshed
 * behind the page — the person is taken on to it.
 */
export const Route = createFileRoute('/admin/closed')({
  staticData: { title: 'Not open to you', crumb: 'Admin' },
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === 'string' && search.from.startsWith('/admin/') ? search.from : '',
  }),
  component: ClosedPage,
})

function ClosedPage() {
  const { from } = Route.useSearch()
  const access = useAccess()
  const router = useRouter()
  const opened = Boolean(from) && mayOpen(access, from)

  useEffect(() => {
    if (opened) router.history.replace(from)
  }, [opened, from, router])

  if (opened) return null
  return (
    <DeniedState
      pageName={from ? navLabel(adminPortal, from) : 'This page'}
      body={
        from
          ? closedBecause(from)
          : 'Your account has not been granted the privilege that page needs. An administrator who manages privileges can add it to your record.'
      }
      ask="An administrator who manages privileges"
      dashboardPath="/admin"
    />
  )
}
