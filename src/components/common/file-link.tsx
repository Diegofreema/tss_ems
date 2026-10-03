import { Eye } from 'lucide-react'
import { useState } from 'react'
import { BLANK } from '@/features/collections/blank'
import { fileLabel } from '@/lib/file-ref'
import { cn } from '@/lib/utils'
import { FileViewer } from './file-viewer'

/**
 * A stored file, named and openable. The click opens it over the page — a
 * certificate is something the office wants to *look at* while it decides
 * about an application, and a download that lands in a folder somewhere is
 * three steps away from that. The viewer offers the download beside it.
 *
 * These endpoints want the bearer token, so the file cannot be an ordinary
 * link; the viewer fetches it when it opens.
 */
export function FileLink({
  name,
  from,
  title,
  className,
}: {
  /** The stored filename. Empty means the family never supplied this one. */
  name: string
  /**
   * Where to read it, where that is not the filename itself — a teacher's CV
   * is named on the record but served by its own endpoint. See `fileRef`.
   */
  from?: string
  /** What the viewer is headed with — the document's kind, not its filename. */
  title?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  if (!name || name === BLANK) {
    return <span className="text-muted-foreground">{BLANK}</span>
  }

  const filename = fileLabel(name)
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          // The row around it usually does something of its own.
          event.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          'inline-flex max-w-full cursor-pointer items-center gap-1.5 text-brand underline-offset-2 hover:underline',
          className,
        )}
      >
        <Eye className="size-3.5 flex-none" strokeWidth={2.2} />
        <span className="truncate">{filename}</span>
      </button>
      {/* The dialog is portalled out of the row, but React still bubbles its
          clicks up through it — and the row opens the record when clicked. */}
      <span className="contents" onClick={(event) => event.stopPropagation()}>
        <FileViewer
          file={open ? { title: title ?? filename, value: from || name, name: filename } : null}
          onClose={() => setOpen(false)}
        />
      </span>
    </>
  )
}
