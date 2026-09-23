/** No link columns: everything the page offers is a section above it. */
export function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-[clamp(20px,4vw,48px)] pt-[clamp(28px,4vw,44px)] pb-9">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-4.5 bg-brand" />
            <div className="font-heading text-[14px] font-extrabold">NETPRO EMS</div>
          </div>
          <div className="mt-3 text-[11.5px] leading-[1.5] text-muted-foreground">
            Educational management system
            <br />
            2025/2026 session
          </div>
        </div>
      </div>
    </footer>
  )
}
