import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Settings } from 'lucide-react'
import { useLogout } from '@/api/auth/hooks'
import { ConfirmDialog } from '@/components/feedback/confirm-dialog'
import { useSyncStatus } from '@/db/status'
import { accountSummary } from '@/features/auth/account-summary'
import { useSession } from '@/features/auth/session'
import { signOutBody, signOutCta } from '@/features/auth/sign-out'
import { useConfirm } from '@/hooks/use-confirm'

const ROW =
  'flex h-(--rail-row) w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors hover:bg-neutral-100 group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0'

/**
 * The foot of the rail. Two things somebody looks for by name rather than by
 * section — where their own settings are, and the way out.
 *
 * Signing out ends the session on this device whether or not the school
 * answers, so the redirect is unconditional.
 *
 * **It asks first.** This row sits one below Settings on every page in the
 * app, and the click behind it wipes the device — the school's records and the
 * outbox alike, so a register marked in a classroom and not yet sent goes with
 * it. A confirm step on a button that merely ends a session would be a nag;
 * on one that can delete somebody's afternoon it is the difference between an
 * act and an accident.
 */
export function SidebarTools({
  settingsPath,
  onNavigate,
}: {
  settingsPath: string
  onNavigate: () => void
}) {
  const navigate = useNavigate()
  const logout = useLogout()
  const confirm = useConfirm()
  const { account } = useSession()
  // The counts the bar under the header is already reading, so the dialog and
  // the banner cannot disagree about what is waiting.
  const { waiting, failed, review } = useSyncStatus()
  const summary = account ? accountSummary(account) : null

  const signOut = async () => {
    onNavigate()
    await logout.mutateAsync().catch(() => undefined)
    await navigate({ to: '/sign-in' })
  }

  // A rule above it, because the nav scrolls: without one, a long register's
  // nav runs out mid-row right under the Tools heading and the two read as one
  // list.
  return (
    <div className="mt-auto border-t border-divider px-4 pt-(--rail-card) pb-(--rail-foot)">
      <div className="rail-wordy px-3 pb-2 font-heading text-2xs font-extrabold uppercase tracking-kicker text-muted-foreground">
        Tools
      </div>

      <Link to={settingsPath} onClick={onNavigate} className={ROW} title="Settings">
        <Settings className="size-5 flex-none" strokeWidth={1.9} />
        <span className="rail-label flex-1">Settings</span>
      </Link>

      <button
        type="button"
        disabled={logout.isPending}
        onClick={() =>
          confirm.ask({
            title: 'Sign out?',
            body: signOutBody({ waiting, needsAnswer: failed + review }),
            // Who is about to be signed out. On a shared staff-room machine
            // that is the question worth answering before the click, since
            // the person at the keyboard is not always the person signed in.
            subject: summary ? `${summary.name} · ${summary.line}` : 'This account',
            cta: signOutCta(),
            cancel: 'Stay signed in',
            // Held open until the school answers, so the rail does not vanish
            // under a half-finished sign-out.
            onConfirm: signOut,
          })
        }
        className={`${ROW} cursor-pointer !text-danger-ink hover:bg-danger-subtle`}
        title="Logout"
      >
        <LogOut className="size-5 flex-none" strokeWidth={1.9} />
        <span className="rail-label flex-1">
          {logout.isPending ? 'Signing out…' : 'Logout'}
        </span>
      </button>

      <ConfirmDialog request={confirm.request} onOpenChange={confirm.setOpen} />
    </div>
  )
}
