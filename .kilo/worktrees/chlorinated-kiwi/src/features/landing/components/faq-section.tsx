import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { FAQS } from '../landing.content'
import { Reveal } from './reveal'
import { Section, SectionHeading } from './section'

/**
 * 08 — one answer open at a time, the first of them on load.
 *
 * Clicking the open row closes it, so the reader can have the whole list of
 * questions in front of them without an answer in the way.
 */
export function FaqSection() {
  const [open, setOpen] = useState(0)
  const id = useId()

  return (
    <Section
      id="faq"
      lifted
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-start gap-[clamp(24px,4vw,64px)]"
    >
      <Reveal>
        <SectionHeading kicker="08 — Questions" title="Before you commit.">
          <p className="mt-3.5 max-w-[34ch] text-sm leading-[1.55] text-neutral-700">
            Anything not covered here, ask on the walkthrough.
          </p>
        </SectionHeading>
      </Reveal>

      <Reveal className="border-t border-ink">
        {FAQS.map((faq, index) => {
          const expanded = open === index
          return (
            <div key={faq.question} className="border-b border-divider-strong">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${id}-${index}`}
                onClick={() => setOpen(expanded ? -1 : index)}
                className="flex min-h-11 w-full cursor-pointer items-center gap-4 border-0 bg-transparent py-4.5 text-left font-heading text-[clamp(15px,1.5vw,18px)] font-extrabold tracking-[-.01em] text-ink"
              >
                <span className="flex-1">{faq.question}</span>
                <span
                  aria-hidden
                  className={cn(
                    'font-sans text-[22px] leading-none font-normal text-brand transition-transform duration-250 ease-out',
                    expanded && 'rotate-45',
                  )}
                >
                  +
                </span>
              </button>
              <div
                id={`${id}-${index}`}
                hidden={!expanded}
                className="max-w-[58ch] pb-5 text-sm leading-[1.6] text-neutral-800"
              >
                {faq.answer}
              </div>
            </div>
          )
        })}
      </Reveal>
    </Section>
  )
}
