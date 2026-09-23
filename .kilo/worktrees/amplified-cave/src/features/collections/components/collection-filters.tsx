import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { optionsQuery } from '../option-feeds'
import { FilterDateRange } from './filter-date-range'
import { toOptions } from '../options'
import type { FilterSpec } from '../types'

/** A select cannot hold an empty value, so "no filter" travels under a word. */
const ANY = 'any'

function FilterSelect({
  spec,
  value,
  scope,
  onChange,
}: {
  spec: FilterSpec
  value: string
  /** What the parent filter is set to, for a spec that names one. */
  scope: string
  onChange: (value: string) => void
}) {
  const waiting = Boolean(spec.dependsOn) && !scope
  // A hook cannot be skipped, so the feed is named either way and only asked
  // for when this filter actually reads from the API.
  const { data } = useQuery({
    ...optionsQuery(spec.optionsFrom ?? 'classes', scope),
    enabled: Boolean(spec.optionsFrom) && !waiting,
  })

  const options = spec.options ? toOptions(spec.options) : (data ?? [])

  return (
    <Select
      value={value || ANY}
      onValueChange={(chosen) => onChange(chosen === ANY ? '' : chosen)}
      disabled={waiting}
    >
      <SelectTrigger aria-label={spec.label} className="h-8 min-w-37.5">
        <SelectValue placeholder={spec.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{spec.label}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** The collection's dropdowns, sat beside the search box in the filter bar. */
export function CollectionFilters({
  specs,
  filters,
  onChange,
}: {
  specs: readonly FilterSpec[]
  filters: Record<string, string>
  onChange: (values: Record<string, string>, clears: string[]) => void
}) {
  return specs.map((spec) =>
    spec.until ? (
      <FilterDateRange
        key={spec.key}
        spec={spec}
        from={filters[spec.key] ?? ''}
        to={filters[spec.until] ?? ''}
        onChange={(values) => onChange(values, [])}
      />
    ) : (
      <FilterSelect
        key={spec.key}
        spec={spec}
        value={filters[spec.key] ?? ''}
        scope={spec.dependsOn ? (filters[spec.dependsOn] ?? '') : ''}
        onChange={(value) =>
          onChange(
            { [spec.key]: value },
            specs.filter((other) => other.dependsOn === spec.key).map((other) => other.key),
          )
        }
      />
    ),
  )
}
