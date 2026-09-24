import { useQuery } from '@tanstack/react-query'
import { STATES_KNOWN_FOR } from '@/features/collections/country-ids'

/**
 * Nigeria's states, numbered the school's way. Off the device, not the
 * network — the list is a package, loaded on demand so the world's states are
 * a chunk of their own (`countries.ts`) — which is why the query runs whatever
 * the connection: the service worker already holds the chunk.
 */
export function useStates() {
  return useQuery({
    queryKey: ['apply', 'states'],
    queryFn: async () =>
      (await import('@/features/collections/countries')).stateOptions(STATES_KNOWN_FOR),
    staleTime: Infinity,
    networkMode: 'always',
  })
}
