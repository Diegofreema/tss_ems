import { AlertCircle, HelpCircle } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ConfirmTone } from './confirm-tone'

export type { ConfirmTone }

export type ConfirmRequest = {
  title: string
  body: string
  /**
   * The record the action applies to, shown in a neutral block.
   *
   * Usually the row's name. A node where naming it is not enough to decide by:
   * a question about to go on a paper is its wording, its kind, what it is
   * worth and which choice is ticked, and a dialog that showed only the first
   * of those would be asking the teacher to confirm something it had not shown
   * them.
   */
  subject: ReactNode
  /**
   * Label of the destructive button, e.g. "Delete the student".
   *
   * Left out where there is nothing to confirm — the action cannot be taken at
   * all, and the dialog says why. No button is drawn then, and the way back
   * becomes the only one: offering a "Try anyway" beside a refusal the school
   * has already made invites the desk to press it and be refused again, on a
   * page it has to be led back from.
   */
  cta?: string
  /** Label of the cancel button — "Keep it", "Go back", "Keep working". */
  cancel?: string
  /** Defaults to `danger`, which is what most of these dialogs are for. */
  tone?: ConfirmTone
  /**
   * Returning the write's promise holds the dialog open until the API answers,
   * with the button spinning. A caller that returns nothing closes at once, as
   * before — right for an action with no server behind it.
   */
  onConfirm: () => void | Promise<unknown>
}

/**
 * The design's confirm: an accent frame over a 58% scrim, in danger unless the
 * caller says otherwise. Escape and scrim click cancel, both handled by the
 * underlying Dialog.
 */
export function ConfirmDialog({
  request,
  onOpenChange,
}: {
  request: ConfirmRequest | null
  onOpenChange: (open: boolean) => void
}) {
  const [pending, setPending] = useState(false)
  const brand = request?.tone === 'brand'
  const Icon = brand ? HelpCircle : AlertCircle

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
        className={cn(
          'w-[min(460px,100%)] gap-0 border bg-raised p-0 shadow-float sm:max-w-[460px]',
          brand ? 'border-primary' : 'border-danger',
        )}
      >
        {request && (
          <>
            <div className="p-5.5 pb-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'grid size-[22px] flex-none place-items-center rounded-sm text-white',
                    brand ? 'bg-primary' : 'bg-danger',
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.6} />
                </div>
                <DialogTitle className="font-heading text-xl font-extrabold">
                  {request.title}
                </DialogTitle>
              </div>
              <DialogDescription className="mt-3.5 text-sm text-muted-foreground">
                {request.body}
              </DialogDescription>
              {/* Capped and scrollable: the subject is a line of text for most
                  of these dialogs and a read-back for some, and a tall one must
                  not push the buttons off a laptop's screen. */}
              <div className="mt-4 max-h-[min(46vh,340px)] overflow-y-auto rounded-md bg-neutral-100 px-3.5 py-3 text-sm">
                {request.subject}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 p-5.5">
              {/* Closed here rather than with `DialogClose asChild`, which
                  overwrites the button's `data-slot` and so loses the design's
                  44px touch target on a phone. */}
              <Button
                // The only button when there is nothing to confirm, and then it
                // is the solid one: a lone outline button reads as the quiet
                // half of a pair whose other half never arrived.
                variant={request.cta ? 'outline' : 'default'}
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                {request.cancel ?? 'Keep it'}
              </Button>
              {/* The brand tone takes the button's own default fill, which is
                  already the brand — only the danger one is dressed here. */}
              {request.cta && (
                <Button
                  pending={pending}
                  onClick={() => void run()}
                  className={cn(
                    !brand &&
                      'bg-danger text-white hover:bg-danger/85 focus-visible:border-danger focus-visible:ring-danger/40',
                  )}
                >
                  {request.cta}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
