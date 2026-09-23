import { useQuery } from '@tanstack/react-query'
import { libraryKeys } from './keys'
import { libraryService } from './service'

/** Every borrowing on record, newest first. */
export function useLoans() {
  return useQuery({
    queryKey: libraryKeys.loans(),
    queryFn: () => libraryService.loans(),
  })
}
