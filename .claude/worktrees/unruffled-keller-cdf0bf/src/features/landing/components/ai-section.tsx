import { AI_USES } from '../landing.content'
import { Reveal } from './reveal'
import { QUAD_GRID, Section, SectionHeading } from './section'

/** 05 — what the assistant drafts, and who signs it off. */
export function AiSection() {
  return (
    <Section id="ai" lifted>
      <Reveal className="flex flex-wrap items-end justify-between gap-5.5">
        <SectionHeading
          className="max-w-[660px]"
          kicker="05 — AI where it saves real hours"
          title="The system already holds the data. AI reads it and drafts the work nobody enjoys."
        />
        <p className="max-w-[32ch] text-[13.5px] leading-[1.5] text-neutral-700">
          Every draft goes to a person for approval. Nothing reaches a parent or a
          report sheet unsigned.
        </p>
      </Reveal>

      <Reveal className={`${QUAD_GRID} mt-[clamp(28px,4vw,48px)]`}>
        {AI_USES.map((use) => (
          <div
            key={use.role}
            className="flex min-h-[300px] flex-col gap-3 bg-ground px-5 pt-6 pb-5.5"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="text-[10.5px] font-bold tracking-[.14em] text-brand-700 uppercase">
                {use.role}
              </div>
              <div className="size-3 bg-brand" />
            </div>
            <div className="mt-3.5 font-heading text-[clamp(17px,1.8vw,20px)] font-extrabold tracking-[-.015em]">
              {use.name}
            </div>
            <div className="text-[13px] leading-[1.5] text-neutral-800">
              {use.body}
            </div>
            <div className="mt-auto border-t-2 border-divider pt-3 text-[12px] leading-[1.45] text-neutral-700">
              <span className="font-bold text-ink">Instead of:</span> {use.instead}
            </div>
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
