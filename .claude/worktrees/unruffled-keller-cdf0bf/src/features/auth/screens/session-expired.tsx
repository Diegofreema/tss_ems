import { Link } from '@tanstack/react-router'
import { Clock } from 'lucide-react'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '../auth.store'
import { AuthHeading } from '../components/auth-heading'
import { DetailRows } from '../components/detail-rows'
import { IconSquare } from '../components/icon-square'

export function SessionExpiredScreen() {
  const email = useAuthStore((state) => state.email)
  const role = useAuthStore((state) => state.role)
  const reset = useAuthStore((state) => state.reset)

  return (
    <>
      <IconSquare icon={Clock} />
      <AuthHeading
        title="You were signed out"
        description="The session ended after 12 hours without activity. This is how the school keeps records safe on shared computers. Anything you had saved is still saved."
      />
      <DetailRows
        rows={[
          {
            label: 'Account',
            value: [email || 'Your account', role].filter(Boolean).join(' · '),
          },
        ]}
      />
      <Rule />
      <div className="flex flex-wrap gap-2.5">
        <Button asChild>
          <Link to="/sign-in">Sign in again</Link>
        </Button>
        <Button asChild variant="outline" onClick={reset}>
          <Link to="/sign-in">Use a different account</Link>
        </Button>
      </div>
    </>
  )
}
