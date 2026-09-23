import { ExternalLink } from '@/components/common/external-link'
import { FileLink } from '@/components/common/file-link'
import { Tag } from '@/components/common/tag'
import type { Column } from '@/components/data-table/types'
import { toneForStatus } from '@/lib/status-tone'
import { BLANK } from '../blank'
import type { ColumnSpec, Row } from '../types'

/** Turns a collection's column specs into renderable table columns. */
export function toTableColumns(specs: ColumnSpec[]): Column<Row>[] {
  return specs.map((spec) => ({
    key: spec.key,
    label: spec.label,
    align: spec.align,
    cardRole: spec.cardRole,
    nowrap: !spec.tag,
    cell: (row) => {
      if (spec.download) return <FileLink name={row[spec.key]} />
      if (spec.link) return <ExternalLink href={row[spec.key]} />
      // A tag is a state the record is in; where there is no state to report
      // the cell reads as any other blank rather than as an empty badge.
      return spec.tag && row[spec.key] !== BLANK ? (
        <Tag variant={toneForStatus(row[spec.key])}>{row[spec.key]}</Tag>
      ) : (
        row[spec.key]
      )
    },
  }))
}
