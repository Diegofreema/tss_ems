/**
 * The three public place lists, as they answered a signed-out request on
 * 2026-09-24 — read, not taken from the Postman collection, which documents the
 * routes and shows no answer. None takes a token.
 */

/** `GET /countries` — all 247, and the one this school is in. */
export type CountriesAnswer = {
  countries: { id: number; name: string; code: string; phone_code: number }[]
  home_country_id: number
}

/**
 * `GET /states?country_id=` — the school's own country when none is sent; an
 * unknown country answers `[]` rather than every state in the table.
 */
export type StatesAnswer = {
  states: { id: number; name: string }[]
  country_id: number
}

/** `GET /lgas?state_id=` — 422 without a state: 892 rows is not a list. */
export type LgasAnswer = {
  lgas: { id: number; name: string }[]
  state_id: number
}
