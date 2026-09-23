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
    <div className="flex flex-wrap items-start gap-[18px]">
      <div className="grid size-16 flex-none place-items-center bg-brand font-heading text-[22px] font-extrabold text-white">
        {initials}
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="text-[10px] uppercase tracking-[0.12em] text-brand-700">
          My account
        </div>
        <h2 className="mt-2 text-page-title">{name}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>
      </div>
    </div>
  )
}
