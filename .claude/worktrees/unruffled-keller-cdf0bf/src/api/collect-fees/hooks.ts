import { useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { collectFeeKeys } from './keys'
import { collectFeesService } from './service'
import type { CollectionsReportParams } from './types'

/**
 * The school's payment methods, read once and shared.
 *
 * Not a hook: the row mappers need it to name a method on a transaction, and
 * they run outside React. `ensureQueryData` means the select on the payment
 * form and the history table beneath an invoice cost one request between them.
 */
export const paymentMethods = () =>
  queryClient.ensureQueryData({
    queryKey: collectFeeKeys.paymentMethods(),
    queryFn: () => collectFeesService.paymentMethods(),
    // The four ways a school takes money change when the school changes bank,
    // not mid-session.
    staleTime: Infinity,
  })

export function useCollectionsReport(params: CollectionsReportParams) {
  return useQuery({
    queryKey: collectFeeKeys.report(params),
    queryFn: () => collectFeesService.report(params),
  })
}
