import { createFileRoute } from '@tanstack/react-router'
import { NotificationsPage } from '@/features/notifications/notifications-page'
import { useNoticeFeed } from '@/features/notifications/use-notice-feed'

export const Route = createFileRoute('/student/notifications')({
  staticData: { title: 'Notifications', crumb: 'Overview' },
  // No loader: the board is read in the component, so a board that cannot be
  // reached costs this page and never the shell around it.
  component: StudentNotifications,
})

function StudentNotifications() {
  const feed = useNoticeFeed()
  return (
    <NotificationsPage
      notifications={feed.notices}
      boardError={feed.error}
      description="Every notice the school has posted to you, newest first."
    />
  )
}
