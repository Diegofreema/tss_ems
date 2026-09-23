import { Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'

const ROWS = (pageName: string) => [
  { label: 'Page', value: pageName },
  { label: 'Ask', value: 'The school office — 0803 000 0000' },
]

const PRIVILEGE_BODY =
  'Your account does not carry the privilege this page needs. Nothing was changed, and the attempt is written to the activity log.'

/** Shown when a route is closed to the person who asked for it. */
export function DeniedState({
  pageName,
  body = PRIVILEGE_BODY,
  dashboardPath,
  onRequestAccess,
}: {
  pageName: string
  /** Why it is closed, where it is not the ordinary want of a privilege. */
  body?: string
  dashboardPath: string
  onRequestAccess: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[580px] py-10">
      <div className="grid size-10 place-items-center rounded-lg bg-brand text-white">
        <Lock className="size-5.25" strokeWidth={2.1} />
      </div>
      <h2 className="mt-5 text-page-title">You cannot open this page</h2>
      <p className="mt-2.5 text-sm text-muted-foreground">{body}</p>

      <div className="mt-4.5 border-t border-divider-strong">
        {ROWS(pageName).map((row) => (
          <div
            key={row.label}
            className="flex gap-4 border-b border-divider px-0.5 py-3"
          >
            <div className="w-2/5 text-2xs uppercase tracking-label text-muted-foreground">
              {row.label}
            </div>
            <div className="flex-1 text-sm">{row.value}</div>
          </div>
        ))}
      </div>

      <Rule />
      <div className="flex flex-wrap gap-2.5">
        <Button asChild>
          <Link to={dashboardPath}>Back to dashboard</Link>
        </Button>
        <Button variant="outline" onClick={onRequestAccess}>
          Request access
        </Button>
      </div>
    </div>
  )
}
