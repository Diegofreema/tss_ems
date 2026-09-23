import { CircleAlert } from 'lucide-react'

/**
 * Appears above the form after a failed submit. The design counts the fields
 * rather than listing them — every bad field is marked in place.
 */
export function FormErrorBanner({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div
      role="alert"
      className="mb-6 flex animate-ems-up gap-3 rounded-lg border border-danger/50 bg-danger-subtle px-4 py-3.5"
    >
      <CircleAlert
        className="mt-px size-[18px] flex-none text-danger-ink"
        strokeWidth={2.2}
      />
      <div>
        <div className="font-heading text-sm font-extrabold">
          {count === 1 ? 'One field needs attention' : `${count} fields need attention`}
        </div>
        <div className="mt-0.75 text-sm text-muted-foreground">
          Nothing has been saved. Fix the fields marked below and save again.
        </div>
      </div>
    </div>
  )
}
