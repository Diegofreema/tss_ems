import { useQuery } from '@tanstack/react-query'
import { namedOptions } from '../named-options'
import { placeKeys } from './keys'
import { placesService } from './service'

/*
 * Plain `useQuery`s, and the exception is deliberate: these are read by the
 * public application form, before anybody has an account, and a signed-out
 * visitor must never start a collection — those belong to a session and are
 * wiped at sign-out.
 *
 * Held for the session (`staleTime: Infinity`): unlike the school's classes,
 * nothing about a country's states changes while a family fills in a form.
 * `networkMode: 'always'` so that offline a list fails and its field says so,
 * rather than pausing on "Loading…" for as long as the connection is down.
 */
const PLACE_QUERY = { staleTime: Infinity, networkMode: 'always', retry: 1 } as const

/** Every country, and the id of the one the school is in. */
export function useCountries() {
  return useQuery({
    ...PLACE_QUERY,
    queryKey: placeKeys.countries(),
    queryFn: async () => {
      const answer = await placesService.countries()
      return { options: namedOptions(answer.countries), home: String(answer.home_country_id) }
    },
  })
}

/** One country's states. Does not run until a country is chosen. */
export function useStates(countryId: string) {
  return useQuery({
    ...PLACE_QUERY,
    queryKey: placeKeys.states(countryId),
    queryFn: async () => namedOptions((await placesService.states(Number(countryId))).states),
    enabled: Boolean(countryId),
  })
}

/** One state's local government areas. Does not run until a state is chosen. */
export function useLgas(stateId: string) {
  return useQuery({
    ...PLACE_QUERY,
    queryKey: placeKeys.lgas(stateId),
    queryFn: async () => namedOptions((await placesService.lgas(Number(stateId))).lgas),
    enabled: Boolean(stateId),
  })
}
