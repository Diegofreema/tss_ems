import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'
import { useSession } from '@/features/auth/session'
import { ErrorState } from './error-state'

/**
 * Every route's error boundary, set once on the router.
 *
 * A route that throws is drawn by the nearest boundary **in place of its own
 * component**, so this renders in two quite different places: inside a
 * portal's shell when a page's own loader threw, and on a bare screen when the
 * shell's did — there being no shell to render in that case. It is centred and
 * padded so it reads as a page either way.
 *
 * Retrying invalidates the router rather than reloading: the loaders run
 * again, and a reader who was three pages deep stays there.
 */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const { portal } = useSession()

  return (
    <div className="grid min-h-[70vh] place-items-center p-content">
      <ErrorState
        error={error}
        // Signed out, there is no dashboard to go back to — the sign-in form
        // is the only page that account can open.
        homeTo={portal?.to ?? '/sign-in'}
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </div>
  )
}
