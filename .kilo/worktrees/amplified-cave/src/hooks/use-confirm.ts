import { useState } from 'react'
import type { ConfirmRequest } from '@/components/feedback/confirm-dialog'

/** Holds the pending destructive action for a page. */
export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  return {
    request,
    ask: setRequest,
    setOpen: (open: boolean) => {
      if (!open) setRequest(null)
    },
  }
}
