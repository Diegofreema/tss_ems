import type { QueryClient } from '@tanstack/react-query'
import { resyncCollections } from '@/db/collection'
import { analyticsKeys } from './analytics/keys'
import { collectFeeKeys } from './collect-fees/keys'
import { feeKeys } from './fees/keys'
import { invoiceKeys } from './invoices/keys'
import { mySchoolingKeys } from './my-schooling/keys'
import { myFamilyKeys } from './parents/keys'
import { userKeys } from './users/keys'

/**
 * Everywhere a naira figure is read.
 *
 * One invoice settled is the office's invoice register, the counter's
 * outstanding list and its day's takings, the analytics panel's revenue, the
 * student's own ledger, the guardian's, and whether the school considers that
 * student to owe anything — seven answers from six controllers, all of which
 * were true a moment ago and none of which is told.
 *
 * Named here because every write that moves money has the same reach, and
 * asking each one to remember six keys is how they came to remember two.
 *
 * The guardian's ledger is no longer one of those keys — it is a collection on
 * their own device now — so the sets are resynced alongside the invalidation.
 * An invalidation does not reach a collection, and a settled invoice that
 * still reads as owing is exactly the kind of quiet wrongness this function
 * exists to prevent.
 */
export function dropMoneyReads(queryClient: QueryClient): void {
  const roots = [
    invoiceKeys.all,
    collectFeeKeys.all,
    // Allocation counts sit on the fee itself.
    feeKeys.all,
    userKeys.fees(),
    analyticsKeys.all,
    mySchoolingKeys.all,
    myFamilyKeys.all,
  ]
  for (const queryKey of roots) queryClient.invalidateQueries({ queryKey })

  void resyncCollections()
}
