import { parseAsString, useQueryState } from 'nuqs'
import { useMarkAllNoticesRead } from '@/api/notifications/hooks'
import { SectionHeading } from '@/components/common/section-heading'
import { SegmentedControl } from '@/components/common/segmented-control'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { NotificationRow } from './components/notification-row'
import { useNotificationsStore } from './notifications.store'
import type { Notification } from './types'

const GROUPS = ['Today', 'Earlier'] as const

/** The full notification centre, grouped under Today and Earlier. */
export function NotificationsPage({
  notifications,
  description,
  /** Why the board is missing, where it is. */
  boardError,
}: {
  notifications: Notification[]
  description: string
  boardError?: string | null
}) {
  const [filter, setFilter] = useQueryState(
    'filter',
    parseAsString.withDefault('all'),
  )
  const read = useNotificationsStore((state) => state.read)
  const markAllRead = useNotificationsStore((state) => state.markAllRead)
  const markBoardRead = useMarkAllNoticesRead()
  const unread = notifications.filter((item) => !item.read && !read[item.id])

  /**
   * One call to `read-all`, and the browser's own marks alongside it so the
   * wash lifts before the refetch confirms. Fired whenever there is a board to
   * clear rather than only when this browser still counts something unread: a
   * notice read on another device leaves the server unread while this tab shows
   * none, and the button has to reach the server either way. Only a truly empty
   * board holds the call back, so the toast never claims to clear nothing.
   */
  const clearAll = () => {
    if (notifications.length === 0) return
    markAllRead(notifications.map((item) => item.id))
    markBoardRead.mutate()
  }

  const visible = filter === 'unread' ? unread : notifications

  return (
    <div className="mx-auto w-full max-w-[780px]">
      <PageHeader
        kicker="School"
        title="Notifications"
        description={description}
        action={
          <Button variant="outline" pending={markBoardRead.isPending} onClick={clearAll}>
            Mark all read
          </Button>
        }
      />
      <Rule />

      {boardError && (
        <div className="mb-5 rounded-lg border border-divider bg-brand/6 px-4 py-3 text-sm">
          <span className="font-bold">The notice board could not be read.</span>{' '}
          <span className="text-muted-foreground">
            {notifications.length > 0
              ? 'Notices from the office are missing; what is below comes from your own records.'
              : 'Notices from the office are missing. Try again shortly.'}
          </span>
        </div>
      )}

      <SegmentedControl
        name="notification-filter"
        className="mb-5"
        value={filter}
        onChange={(value) => void setFilter(value === 'all' ? null : value)}
        options={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
        ]}
      />

      {visible.length === 0 ? (
        <div className="rounded-xl border border-divider bg-raised px-6 py-14 text-center shadow-card">
          <div className="font-heading text-lg font-extrabold">
            Nothing to read
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            You are up to date. New notifications appear here as they arrive.
          </p>
        </div>
      ) : (
        GROUPS.map((group) => {
          const items = visible.filter((item) => item.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-6">
              <SectionHeading className="mb-2.5">{group}</SectionHeading>
              <div className="border-t border-divider-strong">
                {items.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
