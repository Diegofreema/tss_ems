import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Where "Message the school" used to be.
 *
 * It was a form that toasted "Message sent" and called nothing — which is why
 * it was never in the nav. The real thing is `/parent/messages`, a thread the
 * school can answer, so this path leads there rather than 404ing on anybody
 * who bookmarked it.
 */
export const Route = createFileRoute('/parent/msg-school')({
  beforeLoad: () => {
    throw redirect({ to: '/parent/messages' })
  },
})
