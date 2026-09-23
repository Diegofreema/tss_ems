import { MARQUEE } from '../landing.content'

/** The list is drawn twice and the row slides half its width, so there is no seam. */
export function Marquee() {
  return (
    <div className="overflow-hidden border-b-2 border-divider bg-neutral-100">
      <div className="flex w-max animate-ems-marquee">
        {[...MARQUEE, ...MARQUEE].map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-[22px] px-[22px] py-[11px] text-[11px] font-bold tracking-[.13em] whitespace-nowrap text-neutral-600 uppercase"
          >
            <span className="size-[5px] flex-none bg-brand" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
