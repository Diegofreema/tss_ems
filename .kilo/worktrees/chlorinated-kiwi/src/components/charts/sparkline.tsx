import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * A stat card's pulse: one polyline over a real series, drawing itself in,
 * with a soft fill fading out beneath it and a dot on the newest point.
 *
 * It carries no axes and no figures — the card's own value and delta say the
 * numbers — so it is only ever decoration of data that genuinely exists.
 * Callers must pass a real series; nothing here invents one.
 */
export function Sparkline({
  points,
  className,
}: {
  points: number[]
  className?: string
}) {
  const gradient = useId()
  // One point draws nothing worth reading, and an all-zero series is a flat
  // line at the floor — both are drawn honestly rather than skipped.
  if (points.length < 2) return null

  const peak = Math.max(...points, 1)
  const step = 100 / (points.length - 1)
  const coords = points.map((value, index) => ({
    x: index * step,
    y: 34 - (value / peak) * 30,
  }))
  const path = coords.map(({ x, y }) => `${x},${y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <svg
      viewBox="0 0 100 36"
      preserveAspectRatio="none"
      aria-hidden
      className={cn('h-9 w-full overflow-visible', className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,36 ${path} 100,36`}
        fill={`url(#${gradient})`}
        className="animate-ems-fade"
      />
      <polyline
        points={path}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="animate-ems-draw"
      />
      {/* The newest point, where the eye should land. A zero-length stroke
          rather than a circle: preserveAspectRatio="none" would stretch a
          circle into an ellipse, but a non-scaling round cap stays a dot. */}
      <polyline
        points={`${last.x},${last.y} ${last.x},${last.y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="animate-ems-fade"
        style={{ animationDelay: '500ms' }}
      />
    </svg>
  )
}
