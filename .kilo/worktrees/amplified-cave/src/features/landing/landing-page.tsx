import { AiSection } from './components/ai-section'
import { ClosingPoster } from './components/closing-poster'
import { FaqSection } from './components/faq-section'
import { FeaturesSection } from './components/features-section'
import { FrictionSection } from './components/friction-section'
import { Hero } from './components/hero'
import { LandingFooter } from './components/landing-footer'
import { LandingHeader } from './components/landing-header'
import { Marquee } from './components/marquee'
import { SolutionsSection } from './components/solutions-section'
import { TermSection } from './components/term-section'
import { TrustSection } from './components/trust-section'
import { VoicesSection } from './components/voices-section'
import { WalkthroughSection } from './components/walkthrough-section'
import { useAnchorScroll } from './use-anchor-scroll'

/**
 * What a visitor lands on.
 *
 * The order is the argument: the problem a school has today, what the system
 * does about each part of it, a term moving through it, the feature set, where
 * AI earns its place, who says so, how setup goes, what is still being asked —
 * and only then the form. Signing in stays available from the header the whole
 * way down, because a school already using it did not come here to be sold to.
 */
export function LandingPage() {
  useAnchorScroll()

  return (
    <div className="bg-background text-foreground">
      <LandingHeader />
      <Hero />
      <Marquee />
      <FrictionSection />
      <SolutionsSection />
      <TermSection />
      <FeaturesSection />
      <AiSection />
      <VoicesSection />
      <TrustSection />
      <FaqSection />
      <WalkthroughSection />
      <ClosingPoster />
      <LandingFooter />
    </div>
  )
}
