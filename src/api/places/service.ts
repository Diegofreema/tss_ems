import { request } from '../client'
import type { CountriesAnswer, LgasAnswer, StatesAnswer } from './types'

export const placesService = {
  countries: () => request<CountriesAnswer>('countries'),
  states: (countryId: number) =>
    request<StatesAnswer>('states', { query: { country_id: countryId } }),
  lgas: (stateId: number) => request<LgasAnswer>('lgas', { query: { state_id: stateId } }),
}
