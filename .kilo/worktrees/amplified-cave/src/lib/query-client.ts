import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { dropDerivedReads } from '@/features/collections/invalidate'
import { errorMessage, OFFLINE_MESSAGE } from './errors'
import type { MutationToast } from './mutation-toast'

/**
 * What a mutation tells the toaster.
 *
 * Declared on the hook rather than fired from inside it: the wording then
 * lives beside the endpoint it describes, one line instead of an `onSuccess`
 * block, and a mutation written without it is visibly missing its message
 * rather than quietly silent.
 *
 * Defined in `./mutation-toast` and re-exported here, because the local-first
 * queue raises the same sentence for writes that never reach react-query.
 */
export type { MutationToast }

/**
 * Augments `query-core` rather than `react-query`, which re-exports `Register`
 * without declaring it.
 *
 * `@tanstack/query-db-collection` augments the same interface at its own home
 * to add `queryMeta`, and once it does, an augmentation aimed at the
 * re-exporting module is quietly dropped — every `meta.success` in the app
 * goes back to `unknown` and the toasts stop type-checking. Aiming both at
 * `query-core` is what keeps the two side by side.
 */
declare module '@tanstack/query-core' {
  interface Register {
    mutationMeta: MutationToast
  }
}

export const queryClient = new QueryClient({
  // Every mutation announces itself from here, so no screen has to remember to.
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta) toast.success(mutation.meta.success)
      // And drops what every write makes stale wherever it happened. A hook
      // still declares its own domain — that part is local knowledge and stays
      // where it is — but the registers, records, pickers and dashboards built
      // on top of a dozen endpoints are nobody's local knowledge, and asking
      // each write site to remember them is what left half the app needing a
      // browser reload to show what had just been saved. See `dropDerivedReads`.
      void dropDerivedReads(queryClient)
    },
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.meta?.ownsError) toast.error(errorMessage(error, OFFLINE_MESSAGE))
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
