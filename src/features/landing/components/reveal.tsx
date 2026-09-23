import { type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A block that rises into place as it is scrolled to.
 *
 * It arms itself rather than starting hidden, and only after two frames have
 * actually run. A document that is never rendered — a background tab, an embed
 * — never fires them, and anything hidden up front would stay hidden there for
 * good. Whatever is already on screen is left alone, so the first paint is the
 * whole fold rather than an empty page that animates in.
 */
export function Reveal({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'armed' | 'in'>('idle')

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let observer: IntersectionObserver | undefined
    const arrive = () => {
      setState('in')
      observer?.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
    // The observer is what normally fires. This is the belt to its braces: an
    // armed block that is never told it arrived stays invisible for good, and
    // that is a blank page rather than a missing animation.
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) arrive()
    }

    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) return
        setState('armed')
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) arrive()
          },
          { rootMargin: '0px 0px -8% 0px' },
        )
        observer.observe(el)
        window.addEventListener('scroll', onScroll, { passive: true })
      })
    })

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div
      ref={ref}
      data-reveal={state}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.7,.2,1)]',
        'data-[reveal=armed]:translate-y-[18px] data-[reveal=armed]:opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}
