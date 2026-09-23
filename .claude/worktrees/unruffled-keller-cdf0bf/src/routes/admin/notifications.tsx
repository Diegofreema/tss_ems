import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { useOfficeNoticeFeed } from '@/features/notifications/use-notice-feed'

export const Route = createFileRoute('/admin/notifications')({
  staticData: { title: 'Notifications', crumb: 'Overview' },
  // No loader: the board is read in the component, so a board that cannot be
  // reached costs this page and never the shell around it.
  component: AdminNotifications,
})

function AdminNotifications() {
  const feed = useOfficeNoticeFeed()
  return (
    <NotificationsPage
      notifications={feed.notices}
      boardError={feed.error}
      description="Every notice on the school's board, newest first."
    />
  )
}
