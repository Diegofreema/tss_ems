/** The accent initials block, the kicker, the name and the role line. */
export function ProfileIdentity({
  initials,
  name,
  meta,
}: {
  initials: string
  name: string
  meta: string
}) {
  return (
    <div className="flex flex-wrap items-start gap-4.5">
      <div className="grid size-16 flex-none place-items-center rounded-lg bg-brand font-heading text-xl font-extrabold text-white">
        {initials}
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="text-2xs uppercase tracking-kicker text-brand-700">
          My account
        </div>
        <h2 className="mt-2 text-page-title">{name}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>
      </div>
    </div>
  )
}
