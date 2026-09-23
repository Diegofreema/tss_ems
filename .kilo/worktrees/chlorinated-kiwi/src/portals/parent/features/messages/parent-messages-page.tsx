import { MessagesPage } from '@/features/messages/components/messages-page'
import { useFamily } from '../../parent.store'

/**
 * A guardian's side of the in-app messages.
 *
 * This is the case the whole local-first design was built for, at its
 * plainest: a guardian in a village opens the portal with no signal, reads
 * what their child's teacher said, answers it, and the answer goes when the
 * phone next finds a network. Nothing on this page waits on the school except
 * the messages inside an open thread, which says so where it cannot reach it.
 *
 * The children come from the household already on the device, so a thread can
 * be marked as being about one child with no connection either. A guardian
 * with one child still gets the picker — "not about one child" is a real
 * answer, and a fee question is not about a student at all.
 */
export function ParentMessagesPage() {
  const family = useFamily()

  return (
    <MessagesPage
      kicker="Messages"
      description="Write to the staff who teach your children, and to the school office. The school decides who is on your list. Conversations are kept on this device, so they can be read with no connection, and anything you write is sent when there is a signal."
      childOptions={family
        .filter((child) => child.id > 0)
        .map((child) => ({ value: String(child.id), label: child.full }))}
    />
  )
}
