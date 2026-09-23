/** Accent mark, product name and the portal's role label. */
export function SidebarBrand({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="border-b border-divider px-4 pt-4.5 pb-3.5">
      <div className="flex items-center gap-2.5">
        <div className="size-6 flex-none rounded-sm bg-brand" />
        <div>
          <div className="font-heading text-base leading-none font-extrabold">
            NETPRO EMS
          </div>
          <div className="mt-0.75 text-2xs uppercase tracking-[0.1em] text-muted-foreground">
            {roleLabel}
          </div>
        </div>
      </div>
    </div>
  )
}
