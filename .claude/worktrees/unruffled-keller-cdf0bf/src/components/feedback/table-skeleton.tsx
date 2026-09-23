import { Shimmer } from './shimmer'

/** Column weights the design uses for its skeleton rows. */
const CELL_WEIGHTS = [3, 2, 2, 1]

/** The bordered frame a table loads into, shimmering a row at a time. */
export function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="border-2 border-divider">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b border-divider px-3 py-3.5"
        >
          {CELL_WEIGHTS.map((grow, cellIndex) => (
            <Shimmer
              key={cellIndex}
              className="h-[11px]"
              style={{ flex: grow }}
              delay={(rowIndex * CELL_WEIGHTS.length + cellIndex) * 40}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
