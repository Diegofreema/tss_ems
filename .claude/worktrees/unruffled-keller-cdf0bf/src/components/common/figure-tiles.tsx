import { CountUp } from '@/components/common/count-up'
import { TileStrip } from '@/components/page/tile-strip'
import { formatNaira } from '@/lib/format'

export type DashboardFigure = {
  label: string
  amount: number
  format: 'naira' | 'number' | 'percent' | 'decimal'
  delta: string
  /** Renders the delta in accent — the figure needs attention. */
  hot?: boolean
}

const FORMATTERS = {
  naira: formatNaira,
  number: (value: number) => Math.round(value).toLocaleString('en-NG'),
  percent: (value: number) => `${Math.round(value)}%`,
  decimal: (value: number) => value.toFixed(1),
} satisfies Record<DashboardFigure['format'], (value: number) => string>

/** Dashboard tiles, each counting its figure up on mount. */
export function FigureTiles({ figures }: { figures: DashboardFigure[] }) {
  return (
    <TileStrip
      size="lg"
      tiles={figures.map((figure) => ({
        label: figure.label,
        value: <CountUp to={figure.amount} format={FORMATTERS[figure.format]} />,
        delta: figure.delta,
        deltaTone: figure.hot ? 'brand' : 'muted',
      }))}
    />
  )
}
