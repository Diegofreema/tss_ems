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
    /*
     * Each tile counted on its own. `Promise.all` meant one figure that could
     * not be worked out took the whole strip with it — a register counted off
     * the device sat beside a single tile that still asks the school, and with
     * no connection all three went blank. A tile that cannot answer reads as a
     * dash; the ones that can still say what they know.
     */
    queryFn: async () => {
      const counted = await Promise.allSettled(tiles.map((tile) => tile.count()))
      return counted.map((one) => (one.status === 'fulfilled' ? one.value : undefined))
    },
    staleTime: STALE_MS,
    /**
     * Deliberately `always`, not the app's default.
     *
     * A register's tiles are counted off the device now wherever its rows are,
     * so they can answer with no connection — but under `online` react-query
     * pauses without running the function at all, and the figures sat on the
     * school's last answer beside a row the office had just changed. A tile
     * whose count genuinely needs the school refuses instead and reads as a
     * dash, which is the honest answer rather than a stale one.
     */
    networkMode: 'always',
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
            data?.[index] === undefined ? (
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
