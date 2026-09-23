import { MessagesPage } from '@/features/messages/components/messages-page'

/**
 * The staff room's side of the in-app messages.
 *
 * A teacher's contacts are worked out from their own teaching: the guardians
 * of the students they actually take, plus the office. That is why there is no
 * "who can I write to" filter here — the school has already answered it, and
 * writing to anybody else is refused.
 *
 * Not the same thing as **Message admin** or **Message my students** in the
 * nav beside it. Those send outbound email through `/teachers/message-*` and
 * nobody can answer them; this is a thread both sides write to.
 */
export function TeacherMessagesPage() {
  return (
    <MessagesPage
      kicker="Messages"
      description="Conversations with the guardians of the students you teach, and with the office. Unlike the message forms beside this, these are threads — the other side can answer, and their reply arrives here. Read and written on this device, sent when there is a signal."
    />
  )
}
