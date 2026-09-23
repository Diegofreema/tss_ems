import { useNavigate } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForgotPassword, useLogout } from '@/api/auth/hooks'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { useSessionStore } from '@/stores/session.store'
import { useAuthStore } from '../auth.store'
import { usingDefaultPassword } from '../role'

/**
 * The gate in front of a portal opened with the password the office issued.
 *
 * `/users/me` says so itself — `isdefaultpassword` — and it says it on every
 * answer, not only the first, so this is not a thing to remember at sign-in
 * and act on once: it is read off the account the session store holds, and it
 * goes the moment the school stops saying it. A reload, a second tab and a
 * token carried over from yesterday all land in the same place.
 *
 * Nothing dismisses it. Escape, the scrim and the close button are all off,
 * because "before they can use the application" is the whole point of it —
 * a temporary password is one the office typed, wrote down and very often
 * gave to somebody else in the same breath.
 *
 * The way out is the recovery flow the app already has, started from here so
 * nobody has to retype the username they just signed in with: the school
 * emails a six-digit code, and the two screens behind it take the new
 * password. It is the only route on this API that actually sets one — there
 * is no signed-in change-password endpoint, which is also why the profile
 * page's own form still writes nothing.
 */
export function DefaultPasswordGate() {
  const navigate = useNavigate()
  const account = useSessionStore((state) => state.account)
  const startRecovery = useAuthStore((state) => state.startRecovery)
  const forgotPassword = useForgotPassword()
  const logout = useLogout()
  const [failure, setFailure] = useState<string | null>(null)

  if (!usingDefaultPassword(account)) return null

  const username = account?.user.username ?? ''

  const sendCode = async () => {
    setFailure(null)
    try {
      // The same step 1 the forgotten-password screen runs, addressed to the
      // account already signed in. The screen itself cannot be reused as the
      // way in: it validates what is typed into it as an email address, and a
      // student signs in with a registration number.
      const { user_id } = await forgotPassword.mutateAsync({ username })
      startRecovery(username, user_id)
      await navigate({ to: '/check-email' })
    } catch (error) {
      setFailure(errorMessage(error, OFFLINE_MESSAGE))
    }
  }

  const signOut = async () => {
    await logout.mutateAsync().catch(() => undefined)
    await navigate({ to: '/sign-in' })
  }

  const working = forgotPassword.isPending || logout.isPending

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="w-[min(460px,100%)] gap-0 border border-primary bg-raised p-0 shadow-float sm:max-w-[460px]"
      >
        <div className="p-5.5 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="grid size-[22px] flex-none place-items-center rounded-sm bg-primary text-white">
              <KeyRound className="size-3.5" strokeWidth={2.6} />
            </div>
            <DialogTitle className="font-heading text-xl font-extrabold">
              Change your password to continue
            </DialogTitle>
          </div>

          <DialogDescription className="mt-3.5 text-sm text-muted-foreground">
            This account is still on the password the school office issued it.
            Anyone who has seen that password can sign in as you, so the portal
            stays shut until it has been replaced. We will email a six-digit
            code to the address on your account.
          </DialogDescription>

          <div className="mt-4 rounded-md bg-neutral-100 px-3.5 py-3 text-sm">
            {username || 'The account you are signed in as'}
          </div>

          {failure && (
            <p className="mt-3.5 text-sm text-danger-ink">
              {failure} You can try again, or sign out and use “Forgotten
              password” on the sign-in page.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 p-5.5">
          {/* The way out that is not the way through. Somebody at a shared
              staff-room machine who cannot reach their email needs to be able
              to hand the laptop back rather than be held on this screen. */}
          <Button variant="outline" disabled={working} onClick={() => void signOut()}>
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
          <Button pending={forgotPassword.isPending} onClick={() => void sendCode()}>
            Email me a code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
