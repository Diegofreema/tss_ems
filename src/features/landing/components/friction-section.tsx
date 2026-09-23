import { FRICTIONS } from '../landing.content'
import { Reveal } from './reveal'
import { Lede, Section, SectionHeading } from './section'

/** 01 — the case that the data already exists, just not in one place. */
export function FrictionSection() {
  return (
    <Section id="system">
      <Reveal className="grid grid-cols-1 items-start gap-[clamp(24px,4vw,64px)] md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <SectionHeading
          kicker="01 — Where it starts"
          title="Every school already has the data. It is just in the wrong places."
        />

        <div>
          <Lede className="max-w-[58ch]">
            A register in a hardback book. Fees in a bursary ledger. Scores in a
            teacher's notebook until the week reports are due. Parents on the phone
            asking a question the office cannot answer without walking to another
            room.
          </Lede>
          <Lede className="mt-4 max-w-[58ch]">
            The work is not missing. The connection between the pieces is.
          </Lede>

          <div className="mt-8.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[2px] border-t border-divider-strong">
            {FRICTIONS.map((friction) => (
              <div
                key={friction.head}
                className="border-b border-divider-strong py-4.5 pr-4"
              >
                <div className="font-heading text-sm font-extrabold tracking-[.02em]">
                  {friction.head}
                </div>
                <div className="mt-1.5 text-xs leading-[1.45] text-neutral-700">
                  {friction.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}
