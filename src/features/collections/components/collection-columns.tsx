import { ExternalLink } from '@/components/common/external-link'
import { FileLink } from '@/components/common/file-link'
import { PersonAvatar } from '@/components/common/person-avatar'
import { Tag } from '@/components/common/tag'
import type { Column } from '@/components/data-table/types'
import { toneForStatus } from '@/lib/status-tone'
import { BLANK } from '../blank'
import type { ColumnSpec, Row } from '../types'

/**
 * Turns a collection's column specs into renderable table columns.
 *
 * On a register of people, `person` names the column holding the name and
 * the row key holding the photo, and that cell draws the face beside the name
 * — in the table and in the phone's cards alike, since both draw this cell.
 */
export function toTableColumns(
  specs: ColumnSpec[],
  person?: { nameKey: string; photoKey: string },
): Column<Row>[] {
  return specs.map((spec) => ({
    key: spec.key,
    label: spec.label,
    align: spec.align,
    cardRole: spec.cardRole,
    nowrap: !spec.tag,
    cell: (row) => {
      if (person && spec.key === person.nameKey) {
        return (
          <span className="flex items-center gap-2.5">
            <PersonAvatar
              name={row[spec.key]}
              photo={row[person.photoKey]}
              className="size-8 flex-none"
              fallbackClassName="text-xs"
            />
            <span className="min-w-0 truncate">{row[spec.key]}</span>
          </span>
        )
      }
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
