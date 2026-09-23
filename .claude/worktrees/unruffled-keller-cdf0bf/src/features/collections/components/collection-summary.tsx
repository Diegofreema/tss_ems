import { useQuery } from '@tanstack/react-query'
import { CountUp } from '@/components/common/count-up'
import { TileStrip } from '@/components/page/tile-strip'
import { formatCount } from '@/lib/format'
import { BLANK } from '../blank'
import type { CollectionDef, CountTile, TallyTile } from '../types'

/** Longer than a page of rows: a headcount does not move between clicks. */
const STALE_MS = 60_000

/** The tile whose figure came back with the page, where the page sent one. */
function tallyTile(spec: TallyTile | undefined, value: number | undefined) {
  if (!spec || value === undefined) return []
  return [
    {
      label: spec.label,
      value: <CountUp to={value} format={spec.format ?? formatCount} />,
    },
  ]
}

function CountedTiles({
  path,
  tiles,
  tally,
  tallyValue,
}: {
  path: string
  tiles: readonly CountTile[]
  tally?: TallyTile
  tallyValue?: number
}) {
  const { data } = useQuery({
    // Under the collection's own key, so anything that invalidates the list
    // — a decision, a save — moves the figures above it too.
    queryKey: ['collection', path, 'summary'],
    queryFn: () => Promise.all(tiles.map((tile) => tile.count())),
    staleTime: STALE_MS,
  })

  return (
    <TileStrip
      className="mb-5"
      tiles={[
        ...tiles.map((tile, index) => ({
          label: tile.label,
          // A tile that has not answered yet reads blank rather than zero —
          // "0 suspended" is a claim, and one nobody has made yet.
          value:
            data === undefined ? (
              BLANK
            ) : (
              <CountUp to={data[index]} format={tile.format ?? formatCount} />
            ),
        })),
        ...tallyTile(tally, tallyValue),
      ]}
    />
  )
}

/**
 * The figures above a register. A collection either counts them against the
 * API or carries the design's own, and a collection with neither shows none.
 */
export function CollectionSummary({
  definition,
  tally,
}: {
  definition: CollectionDef
  /** The figure that came back with the page, where the endpoint sends one. */
  tally?: number
}) {
  if (definition.counts) {
    return (
      <CountedTiles
        path={definition.path}
        tiles={definition.counts}
        tally={definition.tally}
        tallyValue={tally}
      />
    )
  }
  if (!definition.summary) return null
  return <TileStrip className="mb-5" tiles={definition.summary} />
}
