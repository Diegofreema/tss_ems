import { CircleAlert } from 'lucide-react'

/** A failed sign-in shakes; everything else about it matches the form banner. */
export function AuthAlert({ title, body }: { title: string; body: string }) {
  return (
    <div
      role="alert"
      className="mb-[22px] flex animate-ems-shake gap-3 border-2 border-brand px-4 py-3.5"
    >
      <CircleAlert
        className="mt-px size-[18px] flex-none text-brand"
        strokeWidth={2.2}
      />
      <div>
        <div className="font-heading text-sm font-extrabold">{title}</div>
        <div className="mt-[3px] text-[13px] text-muted-foreground">{body}</div>
      </div>
    </div>
  )
}
