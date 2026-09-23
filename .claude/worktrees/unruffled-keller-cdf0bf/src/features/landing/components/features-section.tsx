import { FEATURES } from '../landing.content'
import { Reveal } from './reveal'
import { QUAD_GRID, Section, SectionHeading } from './section'

/** 04 — the feature set, each card named by the problem it answers. */
export function FeaturesSection() {
  return (
    <Section id="features">
      <Reveal className="flex flex-wrap items-end justify-between gap-5.5">
        <SectionHeading
          className="max-w-[640px]"
          kicker="04 — What you actually get"
          title="Every feature is here because something was going wrong without it."
        />
      </Reveal>

      <Reveal className={`${QUAD_GRID} mt-[clamp(28px,4vw,48px)]`}>
        {FEATURES.map((feature) => (
          <div
            key={feature.name}
            className="flex min-h-[214px] flex-col gap-2.5 bg-ground px-5 pt-6 pb-5.5"
          >
            <div className="size-3 bg-brand" />
            <div className="mt-3 font-heading text-[clamp(16.5px,1.7vw,19px)] font-extrabold tracking-[-.015em]">
              {feature.name}
            </div>
            <div className="text-[13px] leading-[1.5] text-neutral-800">
              {feature.body}
            </div>
            <div className="mt-auto border-t-2 border-divider pt-3 text-[11px] font-bold tracking-[.08em] text-neutral-600 uppercase">
              Solves: {feature.solves}
            </div>
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
