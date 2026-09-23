export type Notification = {
  id: string
  /** Category, shown as a small tag and used by the filter. */
  kicker: string
  title: string
  body: string
  when: string
  group: 'Today' | 'Earlier'
  /** When it happened, in epoch millis. What the feed is ordered by. */
  at?: number
  /** A second line under the body — who posted it and how far it reached. */
  meta?: string
  /** The notice board id this came off. */
  noticeId?: number
  /** The server's own read flag. */
  read?: boolean
}
