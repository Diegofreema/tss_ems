import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorMessage, OFFLINE_MESSAGE } from './errors'

/**
 * What a mutation tells the toaster.
 *
 * Declared on the hook rather than fired from inside it: the wording then
 * lives beside the endpoint it describes, one line instead of an `onSuccess`
 * block, and a mutation written without it is visibly missing its message
 * rather than quietly silent.
 */
export type MutationToast = {
  /** Shown on success, written as the thing that just happened. */
  success: string
  /**
   * Set when the screen reports the failure itself — the sign-in alert, say.
   * Without it every failure also raises an error toast.
   */
  ownsError?: boolean
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: MutationToast
  }
}

export const queryClient = new QueryClient({
  // Every mutation announces itself from here, so no screen has to remember to.
  mutationCache: new MutationCache({
    onSuccess: (_data, _variables, _context, mutation) => {
      if (mutation.meta) toast.success(mutation.meta.success)
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
