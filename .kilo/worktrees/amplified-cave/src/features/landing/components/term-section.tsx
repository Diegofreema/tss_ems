import { useState } from 'react'
import { cn } from '@/lib/utils'
import { STEPS } from '../landing.content'
import { Reveal } from './reveal'
import { Lede, Section, SectionHeading } from './section'

/**
 * 03 — the term in the order it happens, one cell per step.
 *
 * The first cell is lit on load rather than none of them: the point of the row
 * is that it is a sequence, and a row of six identical grey cells does not say
 * that on its own.
 */
export function TermSection() {
  const [active, setActive] = useState(0)

  return (
    <Section id="term" lifted>
      <Reveal className="max-w-[760px]">
        <SectionHeading
          kicker="03 — A term, end to end"
          title="One record, carried from admission to promotion."
        >
          <Lede className="mt-4">
            Each step writes to the same student record, so the next step starts
            with what the last one left behind. Nothing is re-entered.
          </Lede>
        </SectionHeading>
      </Reveal>

      <Reveal className="mt-[clamp(32px,5vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-t border-ink">
        {STEPS.map((step, index) => {
          const lit = index === active
          return (
            <div
              key={step.num}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'min-h-[168px] border-b border-l border-divider-strong px-4.5 pt-5 pb-6.5 transition-colors duration-250 ease-out',
                lit && 'bg-brand-100',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    'font-heading text-2xs font-extrabold tracking-[.14em]',
                    lit ? 'text-brand' : 'text-neutral-500',
                  )}
                >
                  {step.num}
                </div>
                <div
                  className={cn(
                    'size-[7px]',
                    lit ? 'bg-brand' : 'bg-neutral-500',
                  )}
                />
              </div>

              <div className="mt-6.5 font-heading text-[clamp(17px,1.7vw,21px)] font-extrabold tracking-[-.015em]">
                {step.title}
              </div>
              <div className="mt-2 text-xs leading-[1.45] text-neutral-700">
                {step.body}
              </div>
              <div className="mt-3.5 text-2xs font-bold tracking-[.1em] text-neutral-600 uppercase">
                {step.who}
              </div>
            </div>
          )
        })}
      </Reveal>
    </Section>
  )
}
