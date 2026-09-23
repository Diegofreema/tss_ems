import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** The section links, dropped on a narrow screen where the two buttons matter more. */
const LINKS = [
  { href: '#solution', label: 'How it solves it' },
  { href: '#term', label: 'A term, end to end' },
  { href: '#features', label: 'Features' },
  { href: '#ai', label: 'AI' },
]

/**
 * Sticky, and it stays sticky only because nothing above it scrolls on its own
 * — `body` clips its overflow rather than hiding it, which would make the
 * document the wrong scrollport for this.
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-divider-strong bg-[color-mix(in_srgb,var(--ems-ground)_88%,transparent)] backdrop-blur-[10px]">
      <div className="mx-auto flex max-w-[1320px] items-center gap-[clamp(16px,3vw,40px)] px-[clamp(20px,4vw,48px)] py-3.5">
        <a href="#top" className="flex items-center gap-2.5 text-ink no-underline">
          <div className="size-5 flex-none bg-brand" />
          <div className="font-heading text-base font-extrabold tracking-[-.01em] whitespace-nowrap">
            NETPRO EMS
          </div>
        </a>

        <nav className="ml-auto flex flex-wrap items-center justify-end gap-[clamp(12px,2vw,28px)]">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden text-xs font-semibold text-neutral-700 no-underline min-[721px]:block"
            >
              {link.label}
            </a>
          ))}

          <Button asChild variant="outline" className="h-11 px-4">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="h-11 px-4.5">
            <a href="#quote">Book a walkthrough</a>
          </Button>
        </nav>
      </div>
    </header>
  )
}
