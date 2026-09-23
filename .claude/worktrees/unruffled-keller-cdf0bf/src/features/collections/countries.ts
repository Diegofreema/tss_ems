import { Country, State } from 'country-state-city'
import { nigerianStateId, STATES_KNOWN_FOR } from './country-ids.ts'
import type { Option } from './options.ts'

/**
 * The country and state choices, off `country-state-city`.
 *
 * Loaded on demand — the package carries every state in the world, which is
 * not worth putting in front of every page for one field on one form.
 *
 * A country's value is its ISO code rather than a number, because the number
 * the API wants belongs to the school's own table and is resolved when the
 * form is submitted. See the note in `country-ids.ts`.
 */
export function countryOptions(): Option[] {
  return Country.getAllCountries()
    .map((country) => ({ value: country.isoCode, label: country.name }))
    .sort((one, two) => one.label.localeCompare(two.label))
}

/**
 * The states of one country, valued by the school's own id.
 *
 * Only Nigeria's are known — see `country-ids.ts` — so anywhere else the feed
 * is empty rather than offering numbers that would file a teacher in the
 * wrong place.
 */
export function stateOptions(iso: string): Option[] {
  if (iso.toUpperCase() !== STATES_KNOWN_FOR) return []
  return State.getStatesOfCountry(STATES_KNOWN_FOR)
    .slice()
    .sort((one, two) => one.name.localeCompare(two.name))
    .map((state, index) => ({ value: String(nigerianStateId(index)), label: state.name }))
}
