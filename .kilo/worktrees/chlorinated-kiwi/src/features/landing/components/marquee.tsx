import { MARQUEE } from '../landing.content'

/** The list is drawn twice and the row slides half its width, so there is no seam. */
export function Marquee() {
  return (
    <div className="overflow-hidden border-b border-divider-strong bg-neutral-100">
      <div className="flex w-max animate-ems-marquee">
        {[...MARQUEE, ...MARQUEE].map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex items-center gap-5.5 px-5.5 py-2.75 text-2xs font-bold tracking-[.13em] whitespace-nowrap text-neutral-600 uppercase"
          >
            <span className="size-[5px] flex-none bg-brand" />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
