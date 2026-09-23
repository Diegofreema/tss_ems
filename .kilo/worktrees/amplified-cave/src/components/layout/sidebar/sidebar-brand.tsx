/**
 * The school's mark, at the head of the rail.
 *
 * Two marks, one shown at a time. The wordmark needs the rail's full width to
 * be read at all, so a narrowed rail draws the globe instead — the same one
 * the browser tab carries, which is where a reader has already met it, and the
 * same one that ends the wordmark above. It is literally cut from that file
 * (`netpro-mark.png`), so the two cannot drift apart.
 *
 * Both are in the DOM and swapped by opacity, so the change is a cross-fade
 * rather than an image popping in after the rail has finished moving.
 *
 * The portal's name used to sit under it. It has gone: every screen below
 * already says which portal this is, and the design gives the mark the room
 * instead.
 */
export function SidebarBrand() {
  return (
    <div className="relative flex items-center px-6 pt-(--rail-mark-top) pb-(--rail-mark-bottom) group-data-[rail=shut]:justify-center group-data-[rail=shut]:px-0">
      <img
        src="/netpro-logo.webp"
        alt="netpro"
        className="rail-label h-8 w-auto xl:h-9"
      />
      <img
        src="/netpro-mark.png"
        alt=""
        aria-hidden
        className="absolute left-1/2 size-8 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-data-[rail=shut]:opacity-100"
      />
    </div>
  )
}
