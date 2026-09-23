import { Badge } from '@/components/ui/badge'
import { SOLUTIONS } from '../landing.content'
import { Reveal } from './reveal'
import { Section, SectionHeading } from './section'

/** 02 — four problems on the left, what the system does about each on the right. */
export function SolutionsSection() {
  return (
    <Section id="solution">
      <Reveal className="max-w-[780px]">
        <SectionHeading
          kicker="02 — How we solve it"
          title="Four problems, and what the system does about each."
        />
      </Reveal>

      <div className="mt-[clamp(30px,4vw,52px)] border-t-2 border-ink">
        {SOLUTIONS.map((solution) => (
          <Reveal
            key={solution.num}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-[clamp(16px,3vw,48px)] border-b-2 border-divider py-[clamp(22px,3vw,34px)]"
          >
            <div>
              <div className="flex items-baseline gap-3">
                <div className="font-heading text-[11px] font-extrabold tracking-[.14em] text-neutral-500">
                  {solution.num}
                </div>
                <div className="text-[11px] font-bold tracking-[.12em] text-neutral-600 uppercase">
                  The problem
                </div>
              </div>
              <div className="mt-3 font-heading text-[clamp(19px,2.2vw,27px)] font-extrabold tracking-[-.02em]">
                {solution.problem}
              </div>
              <div className="mt-2 max-w-[42ch] text-[13.5px] leading-[1.5] text-neutral-700">
                {solution.pain}
              </div>
            </div>

            <div className="border-l-2 border-brand pl-[clamp(14px,2vw,22px)]">
              <div className="text-[11px] font-bold tracking-[.12em] text-brand-700 uppercase">
                What NETPRO does
              </div>
              <div className="mt-3 max-w-[46ch] text-[clamp(14.5px,1.4vw,17px)] leading-[1.5]">
                {solution.fix}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {solution.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10.5px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
