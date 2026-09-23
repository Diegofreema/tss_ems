import { useEffect } from 'react'

/**
 * Short and fixed, whatever the distance. A scroll whose length grows with the
 * jump — which is what the browser's own smooth behaviour does — takes the best
 * part of a second to cross this page, and by then it reads as a wait rather
 * than as movement.
 */
const DURATION = 420

const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * Carries every in-page link on the landing page to its section rather than
 * cutting to it.
 *
 * One delegated listener on the document, so a section that grows another
 * anchor is covered without being told. The sticky header is measured rather
 * than assumed, since it is what would otherwise sit over the heading the
 * reader just asked for.
 */
export function useAnchorScroll() {
  useEffect(() => {
    let frame = 0
    let watchdog = 0

    const onClick = (event: MouseEvent) => {
      // Anything the browser would treat as "open this elsewhere" is left alone.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      const link = target instanceof Element ? target.closest('a[href^="#"]') : null
      if (!(link instanceof HTMLAnchorElement)) return

      const section = document.getElementById(link.hash.slice(1))
      if (!section) return
      event.preventDefault()

      const header = document.querySelector('header')?.offsetHeight ?? 0
      const from = window.scrollY
      const to = Math.max(0, from + section.getBoundingClientRect().top - header)

      cancelAnimationFrame(frame)
      clearTimeout(watchdog)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, to)
        return
      }

      const start = performance.now()
      let running = false
      const step = (now: number) => {
        running = true
        const progress = Math.min(1, (now - start) / DURATION)
        window.scrollTo(0, from + (to - from) * easeOut(progress))
        if (progress < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)

      // A backgrounded tab and some embedded contexts never run a frame at all.
      // A link that does nothing is worse than one that cuts straight there.
      watchdog = window.setTimeout(() => {
        if (running) return
        cancelAnimationFrame(frame)
        window.scrollTo(0, to)
      }, 150)
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      cancelAnimationFrame(frame)
      clearTimeout(watchdog)
    }
  }, [])
}
