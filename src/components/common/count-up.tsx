import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { useAppearanceStore } from '@/stores/appearance.store'

gsap.registerPlugin(useGSAP)

const DURATION_MS = 900

/**
 * A figure that counts up on mount.
 *
 * The true value is rendered first and the tween only overwrites it while it
 * runs, so a figure is never wrong — if the animation cannot start, the
 * correct number is already on screen.
 */
export function CountUp({
  to,
  format,
}: {
  to: number
  format: (value: number) => string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const motion = useAppearanceStore((state) => state.motion)

  useGSAP(
    () => {
      const node = ref.current
      if (!node || motion === 0) return

      const counter = { value: 0 }
      gsap.to(counter, {
        value: to,
        duration: (DURATION_MS * (motion / 6)) / 1000,
        ease: 'power2.out',
        onUpdate: () => {
          // Rounded: the tween runs through fractions, and a money format that
          // shows kobo would flicker two decimal places all the way up.
          node.textContent = format(Math.round(counter.value))
        },
        onComplete: () => {
          node.textContent = format(to)
        },
      })
    },
    { dependencies: [to, motion] },
  )

  return <span ref={ref}>{format(to)}</span>
}
