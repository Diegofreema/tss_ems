import { Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../auth.store'
import { AuthHeading } from '../components/auth-heading'
import { IconSquare } from '../components/icon-square'
import { PortalLinks } from '../components/portal-links'
import { useSession } from '../session'

export function WrongPortalScreen() {
  const { role } = useSession()
  const reset = useAuthStore((state) => state.reset)
  // "an admin account", "a teacher account" — the guard only sends people here
  // with a role, but the sentence still has to read if one is ever missing.
  const kind = role ? `${/^[AEIOU]/.test(role) ? 'an' : 'a'} ${role.toLowerCase()}` : 'an'

  return (
    <>
      <IconSquare icon={Lock} />
      <AuthHeading
        title="Wrong portal for this account"
        description={`This is ${kind} account, and the link you followed opens a portal it has no access to. Nothing was changed, and the attempt is written to the activity log. Open the portal your account belongs to instead.`}
      />
      <PortalLinks />
      <Rule />
      <Button asChild variant="outline" onClick={reset}>
        <Link to="/sign-in">Sign in as someone else</Link>
      </Button>
    </>
  )
}
