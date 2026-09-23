import type { LucideIcon } from 'lucide-react'

/** The 40px accent square that opens the outcome screens, in the auth blue. */
export function IconSquare({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="mb-6 grid size-10 place-items-center rounded-lg bg-ui-blue text-white">
      <Icon className="size-5.5" strokeWidth={2.2} />
    </div>
  )
}
