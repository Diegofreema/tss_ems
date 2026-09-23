import type { SearchParams } from './types'

/**
 * Keyed on the term and the limit together, so typing a longer term is a new
 * entry rather than an overwrite — which is what lets the previous answer
 * stay on screen while the next one is in flight.
 */
export const searchKeys = {
  all: ['search'] as const,
  results: (params: SearchParams) => [...searchKeys.all, params] as const,
}
