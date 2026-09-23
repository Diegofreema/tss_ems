import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import { useClassSheet } from '@/api/results/hooks'
import type { ClassSheetParams } from '@/api/results/types'
import { EmptyState } from '@/components/feedback/empty-state'
import { TableSkeleton } from '@/components/feedback/table-skeleton'
import { PageHeader } from '@/components/page/page-header'
import { Rule } from '@/components/page/rule'
import { Button } from '@/components/ui/button'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { classSheet, sheetCaption } from './class-sheet'
import { ALL_MARKS, SheetFilters } from './sheet-filters'

/** A filter's id as the endpoint wants it; an unset filter is left off. */
function asId(value: string) {
  return Number(value) || undefined
}

/**
 * The class broadsheet: every pupil against every subject, with the position.
 *
 * Not one of the generic registers — a register's columns are written into its
 * definition, and this sheet's columns are the class's subjects, which are
 * only known once the answer arrives.
 */
export function ClassSheetPage() {
  const [filters, setFilters] = useQueryStates({
    klass: parseAsString.withDefault(''),
    arm: parseAsString.withDefault(''),
    term: parseAsString.withDefault(''),
    session: parseAsString.withDefault(''),
    released: parseAsString.withDefault(ALL_MARKS),
  })

  const params: Partial<ClassSheetParams> = {
    department_id: asId(filters.klass),
    class_arm_id: asId(filters.arm),
    semester_id: asId(filters.term),
    session_id: asId(filters.session),
    ...(filters.released === 'released' ? { approved_only: 1 as const } : {}),
  }

  const { data, isPending, error, fetchStatus, refetch } = useClassSheet(params)
  const onChange = useCallback(
    (next: typeof filters) => void setFilters(next),
    [setFilters],
  )

  const sheet = classSheet(data)
  const caption = sheetCaption(data)

  const header = (
    <>
      <PageHeader
        kicker="Academics"
        title="Class broadsheet"
        description="Every pupil in a class against every subject, with the position worked out. Position is computed each time it is asked for and ties share a place — nothing here is stored."
      />
      <Rule />
      <SheetFilters values={filters} onChange={onChange} />
    </>
  )

  if (!params.department_id) {
    return (
      <div>
        {header}
        <EmptyState
          title="Pick a class"
          body="Pick a class to draw its broadsheet. You can narrow it by arm, term or session after that."
        />
      </div>
    )
  }

  // A request react-query has paused because it believes the browser is
  // offline never resolves and never errors, so it would shimmer for ever.
  const paused = fetchStatus === 'paused'
  if (error || (paused && !data)) {
    return (
      <div>
        {header}
        <EmptyState
          title="This broadsheet could not load"
          body={error ? errorMessage(error, OFFLINE_MESSAGE) : OFFLINE_MESSAGE}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </div>
    )
  }

  if (isPending) {
    return (
      <div>
        {header}
        <TableSkeleton rows={8} />
      </div>
    )
  }

  if (sheet.rows.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          title="Nothing on this sheet yet"
          body={
            filters.released === 'released'
              ? 'No mark in this class has been released. Release a batch from the approval queue and it appears here.'
              : 'No mark has been filed against this class for the term and session chosen.'
          }
        />
      </div>
    )
  }

  return (
    <div>
      {header}

      {caption && (
        <div className="mb-2 text-[12.5px] text-muted-foreground">{caption}</div>
      )}

      {/* The sheet is as wide as the class has subjects, so it scrolls inside
          its own frame rather than pushing the page sideways. */}
      <div className="overflow-x-auto border-2 border-divider">
        <table className="w-full min-w-max border-collapse text-[13px]">
          <thead>
            <tr className="border-b-2 border-divider bg-neutral-100 text-left">
              <th className="sticky left-0 z-10 bg-neutral-100 px-3 py-2.5 font-heading text-[11px] uppercase tracking-[0.06em]">
                Pupil
              </th>
              <th className="px-3 py-2.5 font-heading text-[11px] uppercase tracking-[0.06em]">
                Adm. no.
              </th>
              {sheet.columns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-2.5 text-right font-heading text-[11px] uppercase tracking-[0.06em]"
                >
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-heading text-[11px] uppercase tracking-[0.06em]">
                Total
              </th>
              <th className="px-3 py-2.5 text-right font-heading text-[11px] uppercase tracking-[0.06em]">
                Average
              </th>
              <th className="px-3 py-2.5 text-right font-heading text-[11px] uppercase tracking-[0.06em]">
                Position
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row) => (
              <tr key={row.id} className="border-b border-divider last:border-b-0">
                <td className="sticky left-0 z-10 bg-background px-3 py-2.5 font-semibold">
                  {row.pupil}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.adm}</td>
                {sheet.columns.map((column) => (
                  <td key={column.key} className="px-3 py-2.5 text-right tabular-nums">
                    {row.marks[column.key] ?? '—'}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right tabular-nums">{row.total}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.average}</td>
                <td className="px-3 py-2.5 text-right font-heading font-extrabold tabular-nums">
                  {row.position}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[12.5px] text-muted-foreground">
        {sheet.rows.length} {sheet.rows.length === 1 ? 'pupil' : 'pupils'} ·{' '}
        {sheet.columns.length} {sheet.columns.length === 1 ? 'subject' : 'subjects'}
      </p>
    </div>
  )
}
