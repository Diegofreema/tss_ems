import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Reveal } from './reveal'

/** 09 — the one full-field brand section, and the last word on the page. */
export function ClosingPoster() {
  return (
    <section className="bg-brand text-white">
      <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,48px)] py-[clamp(56px,9vw,128px)]">
        <Reveal>
          <div className="text-[10.5px] font-bold tracking-[.16em] uppercase opacity-85">
            09 — What it changes
          </div>
          <p className="mt-5.5 max-w-[24ch] font-heading text-[clamp(30px,5.6vw,74px)] leading-[1.02] font-extrabold tracking-[-.03em]">
            A parent asks a question and the answer is already on the screen.
          </p>
          <div className="mt-[clamp(28px,4vw,44px)] flex flex-wrap gap-3">
            <Button
              asChild
              className="h-12 bg-white px-[22px] text-[15px] text-ink hover:bg-white/85"
            >
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-white/60 bg-transparent px-[22px] text-[15px] text-white hover:bg-white/15 hover:text-white"
            >
              <a href="#quote">Book a walkthrough</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
