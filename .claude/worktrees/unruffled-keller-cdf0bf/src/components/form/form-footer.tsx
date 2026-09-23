import { Button } from '@/components/ui/button'

/** Save and cancel on the left, the destructive action pushed far right. */
export function FormFooter({
  submitLabel,
  onCancel,
  deleteLabel,
  onDelete,
  pending,
}: {
  submitLabel: string
  onCancel: () => void
  /** Only rendered in edit mode. */
  deleteLabel?: string
  onDelete?: () => void
  pending?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button type="submit" pending={pending}>
        {submitLabel}
      </Button>
      {/* Both are shut while the save is in flight: leaving the page or
          deleting the record mid-write is not something to offer. */}
      <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <div className="flex-1" />
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
    </div>
  )
}
