/**
 * The school's own numbering for countries and states.
 *
 * `country_id` and `state_id` on a staff record are keys into tables that live
 * on the school's server, and the API publishes no catalogue for either —
 * `/countries` and `/states` are undeployed. No package can supply them: the
 * table is the classic countries/states MySQL dump, and every maintained
 * package has since edited that list. `country-state-city` puts Nigeria 159th
 * and `react-country-state-city` 161st; this server holds 160.
 *
 * So the ids here are the ones read back off live records, and nothing is
 * guessed. Adding a country is a line in this map once its id is known.
 */
const SCHOOL_COUNTRY_ID: Record<string, number> = {
  // `GET /users/491` expands country 160 as Nigeria, sortname NG.
  NG: 160,
  // State 1 is Andaman and Nicobar Islands, whose `country_id` is 101.
  IN: 101,
  // Administrator 30's login carries country 1, which reads Afghanistan.
  AF: 1,
}

/**
 * One before Nigeria's first state. They run contiguously in alphabetical
 * order — Ebonyi (12th) is 2658 and Imo (17th) is 2663 on this server, which
 * fixes both the base and the ordering with two independent readings.
 */
const NIGERIAN_STATE_BASE = 2646

/** Whose states this can number. Only Nigeria has been read off the server. */
export const STATES_KNOWN_FOR = 'NG'

/** The school's id for a country, by ISO code. Undefined where unknown. */
export function schoolCountryId(iso: unknown): number | undefined {
  return typeof iso === 'string' ? SCHOOL_COUNTRY_ID[iso.toUpperCase()] : undefined
}

/** Back the other way, so an existing record opens on the country it holds. */
export function countryIso(schoolId: number | null | undefined): string {
  if (!schoolId) return ''
  const found = Object.entries(SCHOOL_COUNTRY_ID).find(([, id]) => id === schoolId)
  return found?.[0] ?? ''
}

/** The school's id for a Nigerian state, by its place in the alphabet. */
export function nigerianStateId(index: number): number {
  return NIGERIAN_STATE_BASE + index + 1
}
