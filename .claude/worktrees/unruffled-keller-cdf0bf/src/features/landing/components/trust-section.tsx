import { Button } from '@/components/ui/button'
import { TRUST } from '../landing.content'
import { Reveal } from './reveal'
import { Lede, Section, SectionHeading } from './section'

/** 07 — what a school gets besides the software. */
export function TrustSection() {
  return (
    <Section id="trust" lifted>
      <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-[clamp(24px,4vw,56px)]">
        <div>
          <SectionHeading
            kicker="07 — Built for the way schools work"
            title="Set up in a week, not a session."
          >
            <Lede className="mt-4 max-w-[44ch]">
              We import the register you already keep, train the office and the staff
              room, and stay on the line through the first set of reports.
            </Lede>
          </SectionHeading>
          <Button asChild className="mt-5.5 h-12 px-[22px] text-[15px]">
            <a href="#quote">Book a walkthrough</a>
          </Button>
        </div>

        <div className="grid border-t-2 border-ink">
          {TRUST.map((item) => (
            <div
              key={item.head}
              className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-3.5 border-b-2 border-divider py-4"
            >
              <div className="mt-[5px] size-2.5 bg-brand" />
              <div>
                <div className="font-heading text-[14.5px] font-extrabold">
                  {item.head}
                </div>
                <div className="mt-1 max-w-[52ch] text-[13px] leading-[1.5] text-neutral-700">
                  {item.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
