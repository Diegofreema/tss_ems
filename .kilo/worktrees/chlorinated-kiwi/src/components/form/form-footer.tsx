import { Button } from '@/components/ui/button'

/**
 * Cancel then save, at the end of the row; anything destructive pushed to the
 * far left, as far from the button somebody is aiming at as the row allows.
 */
export function FormFooter({
  submitLabel,
  onCancel,
  deleteLabel,
  onDelete,
  pending,
  blocked,
}: {
  submitLabel: string
  onCancel: () => void
  /** Only rendered in edit mode. */
  deleteLabel?: string
  onDelete?: () => void
  pending?: boolean
  /**
   * Why this form cannot be saved right now, where something stands in the way
   * that is not the form's own contents — a write this app cannot hold on the
   * device, with no connection to send it over. Said beside the button rather
   * than after pressing it.
   */
  blocked?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {deleteLabel && onDelete && (
        <Button
          type="button"
          variant="destructive"
          onClick={onDelete}
          disabled={pending}
        >
          {deleteLabel}
        </Button>
      )}
      <div className="flex-1" />
      {/* Both are shut while the save is in flight: leaving the page or
          deleting the record mid-write is not something to offer. */}
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={pending}
        className="min-w-28"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        pending={pending}
        disabled={Boolean(blocked)}
        className="min-w-28"
      >
        {submitLabel}
      </Button>
    </div>
  )
}
