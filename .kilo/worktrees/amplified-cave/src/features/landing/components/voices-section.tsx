import { VOICES } from '../landing.content'
import { Reveal } from './reveal'
import { Section, SectionHeading, TRI_GRID } from './section'

/** 06 — three desks. The quotes are placeholders; see the content module. */
export function VoicesSection() {
  return (
    <Section id="voices">
      <Reveal className="max-w-[700px]">
        <SectionHeading
          kicker="06 — From the desks that use it"
          title="What changes in the first term."
        />
      </Reveal>

      <Reveal className={`${TRI_GRID} mt-[clamp(28px,4vw,48px)]`}>
        {VOICES.map((voice) => (
          <figure
            key={voice.who}
            className="m-0 flex flex-col gap-4 bg-ground px-5.5 pt-6.5 pb-5.5"
          >
            <div className="h-1 w-[22px] bg-brand" />
            <blockquote className="m-0 font-heading text-[clamp(17px,1.8vw,21px)] leading-[1.26] font-extrabold tracking-[-.015em]">
              {voice.text}
            </blockquote>
            <figcaption className="mt-auto border-t border-divider-strong pt-3.5 text-xs leading-[1.45] text-neutral-700">
              <div className="font-bold text-ink">{voice.who}</div>
              <div>{voice.where}</div>
            </figcaption>
          </figure>
        ))}
      </Reveal>
    </Section>
  )
}
