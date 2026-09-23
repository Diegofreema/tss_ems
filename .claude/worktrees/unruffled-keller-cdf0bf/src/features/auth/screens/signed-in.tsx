import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../auth.store'
import { AuthHeading } from '../components/auth-heading'
import { IconSquare } from '../components/icon-square'
import { PORTALS, portalFor } from '../role'
import { useSession } from '../session'

export function SignedInScreen() {
  const { role: signedInAs } = useSession()
  const lastKnownRole = useAuthStore((state) => state.role)
  const passwordChanged = useAuthStore((state) => state.passwordChanged)

  // A password reset does not sign anybody in — the new password still has to
  // be used — so the button leads back to sign-in when there is no session.
  const role = signedInAs ?? lastKnownRole
  const portal = signedInAs && role ? portalFor(role) : null

  return (
    <>
      <IconSquare icon={Check} />
      <AuthHeading
        title={passwordChanged ? 'Password saved' : 'You are signed in'}
        description={
          passwordChanged
            ? 'Use the new password from now on. Other devices have been signed out.'
            : 'Take me to the part of the system this account belongs to.'
        }
      />
      <Rule />

      <Button asChild>
        {portal ? (
          <Link to={portal.to}>Open the {portal.role.toLowerCase()} portal</Link>
        ) : (
          <Link to="/sign-in">Sign in</Link>
        )}
      </Button>

      <div className="mt-[22px] flex flex-wrap gap-4 text-xs">
        {PORTALS.map((entry) => (
          <Link key={entry.to} to={entry.to}>
            {entry.label}
          </Link>
        ))}
      </div>
    </>
  )
}
