export const placeKeys = {
  all: ['places'] as const,
  countries: () => [...placeKeys.all, 'countries'] as const,
  states: (countryId: string) => [...placeKeys.all, 'states', countryId] as const,
  lgas: (stateId: string) => [...placeKeys.all, 'lgas', stateId] as const,
}
