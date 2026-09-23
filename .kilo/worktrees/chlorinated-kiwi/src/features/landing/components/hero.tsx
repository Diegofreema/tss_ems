import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { HERO_FACTS } from '../landing.content'
import { HeroLattice } from './hero-lattice'

/**
 * The lattice sits behind the words rather than beside them, so the wrapper
 * lets the pointer through to the canvas and each block takes it back — the
 * animation still reacts under the headline, and the buttons still click.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-divider-strong"
    >
      <HeroLattice />

      <div className="pointer-events-none relative mx-auto grid max-w-[1320px] min-h-[min(78vh,760px)] grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] items-end gap-[clamp(28px,4vw,56px)] px-[clamp(20px,4vw,48px)] pt-[clamp(56px,9vw,120px)] pb-[clamp(40px,6vw,76px)]">
        <div className="pointer-events-auto">
          <div className="mb-5.5 flex items-center gap-2.5">
            <div className="size-2 animate-ems-blink bg-brand" />
            <div className="text-2xs font-bold tracking-[.16em] text-brand-700 uppercase">
              AI-powered educational management, one record
            </div>
          </div>

          <h1 className="max-w-[15ch] text-[clamp(40px,7.2vw,92px)] leading-[.96] tracking-[-.03em] text-balance">
            The school runs on one file, not forty.
          </h1>

          <p className="mt-6.5 max-w-[46ch] text-[clamp(15px,1.5vw,19px)] leading-[1.5] text-neutral-800">
            NETPRO EMS holds enrolment, fees, attendance, scores and reports in a
            single structure, gives the office, the staff room, the student and the
            parent their own way into it, and puts an AI assistant on top of it that
            drafts the report comments, flags the fees at risk and answers the
            parent’s question.
          </p>

          <div className="mt-8.5 flex flex-wrap gap-3">
            <Button asChild className="h-12 px-5.5 text-base">
              <Link to="/sign-in">Sign in to your portal</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-5.5 text-base">
              <a href="#term">See a term move through it</a>
            </Button>
          </div>
        </div>

        {/* Opaque on its own ground: the lattice must not cross the text. */}
        <div className="pointer-events-auto grid w-[min(100%,380px)] justify-self-end gap-[2px] self-end border-l-2 border-ink bg-ground pb-1 pl-4">
          {HERO_FACTS.map((fact) => (
            <div key={fact.name} className="border-t border-divider-strong pt-[13px] pb-[11px]">
              <div className="font-heading text-[clamp(16px,1.8vw,20px)] font-extrabold tracking-[-.015em]">
                {fact.name}
              </div>
              <div className="mt-0.75 text-xs leading-[1.4] text-neutral-700">
                {fact.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
