import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

export type ConfirmRequest = {
  title: string
  body: string
  /** The record the action applies to, shown in a neutral block. */
  subject: string
  /** Label of the destructive button, e.g. "Delete the pupil". */
  cta: string
  /** Label of the cancel button — "Keep it", "Go back", "Keep working". */
  cancel?: string
  /**
   * Returning the write's promise holds the dialog open until the API answers,
   * with the button spinning. A caller that returns nothing closes at once, as
   * before — right for an action with no server behind it.
   */
  onConfirm: () => void | Promise<unknown>
}

/**
 * The design's destructive confirm: a 2px accent frame over a 58% scrim.
 * Escape and scrim click cancel, both handled by the underlying Dialog.
 */
export function ConfirmDialog({
  request,
  onOpenChange,
}: {
  request: ConfirmRequest | null
  onOpenChange: (open: boolean) => void
}) {
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    // A refusal is announced by the mutation cache; all this needs to know is
    // that the write is over, so the dialog stops holding the page.
    await Promise.resolve(request?.onConfirm()).catch(() => {})
    setPending(false)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={Boolean(request)}
      // Escape and the scrim are shut off mid-write: closing would leave the
      // request running with nothing on screen saying so.
      onOpenChange={(open) => !pending && onOpenChange(open)}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[min(460px,100%)] gap-0 border-2 border-danger bg-background p-0 shadow-float sm:max-w-[460px]"
      >
        {request && (
          <>
            <div className="p-5.5 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="grid size-[22px] flex-none place-items-center rounded-sm bg-danger text-white">
                  <AlertCircle className="size-3.5" strokeWidth={2.6} />
                </div>
                <DialogTitle className="font-heading text-xl font-extrabold">
                  {request.title}
                </DialogTitle>
              </div>
              <DialogDescription className="mt-3.5 text-sm text-muted-foreground">
                {request.body}
              </DialogDescription>
              <div className="mt-4 rounded-md bg-neutral-100 px-3.5 py-3 text-sm">
                {request.subject}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 p-5.5">
              {/* Closed here rather than with `DialogClose asChild`, which
                  overwrites the button's `data-slot` and so loses the design's
                  44px touch target on a phone. */}
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                {request.cancel ?? 'Keep it'}
              </Button>
              <Button
                pending={pending}
                onClick={() => void run()}
                className="bg-danger text-white hover:bg-danger/85 focus-visible:border-danger focus-visible:ring-danger/40"
              >
                {request.cta}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
