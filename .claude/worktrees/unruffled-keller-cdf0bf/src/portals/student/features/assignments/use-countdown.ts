import { useEffect, useRef, useState } from 'react'

/**
 * Ticks an assignment's clock down once a second. Stopping it leaves the reading
 * where it was, which is what the design shows after a submit.
 */
export function useCountdown(from: number) {
  const [seconds, setSeconds] = useState(from)
  const running = useRef(true)

  useEffect(() => {
    const timer = setInterval(() => {
      if (!running.current) return
      setSeconds((left) => Math.max(0, left - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return { seconds, stop: () => (running.current = false) }
}
