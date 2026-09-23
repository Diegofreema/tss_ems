import { CircleAlert } from 'lucide-react'

/**
 * A refusal that belongs to the whole form rather than to one field — a
 * password that was wrong, a sign-in the office has switched off. Anything a
 * single field can own is said under that field instead; see `AuthFieldError`.
 */
export function AuthAlert({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="alert"
      className="mt-7 flex animate-ems-shake items-start gap-2.5 rounded-md border border-ui-error/35 bg-ui-error/6 px-4 py-3.5"
    >
      <CircleAlert
        className="mt-0.75 size-4.5 flex-none fill-ui-error text-white"
        strokeWidth={2}
        aria-hidden="true"
      />
      <div>
        <div className="text-base font-medium">{title}</div>
        <div className="mt-1 text-sm text-ui-muted">{body}</div>
      </div>
    </div>
  )
}
