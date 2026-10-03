import { useQuery } from '@tanstack/react-query'
import { Download, ExternalLink, FileQuestion, Loader2 } from 'lucide-react'
import { requestBlob } from '@/api/client'
import { usersService } from '@/api/users/service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { saveBlob } from '@/lib/download'
import { errorMessage, OFFLINE_MESSAGE } from '@/lib/errors'
import { fileKind, fileRef, mimeFor } from '@/lib/file-ref'

/** One file to open: what it is, where it is read from, and its filename. */
export type ViewedFile = {
  /** "Birth certificate", "Photo of Ngozi Eze". */
  title: string
  /** A reference `fileRef` reads — a filename, a folder path or `api:<path>`. */
  value: string
  /** The filename, which names the download and tells the kind apart. */
  name: string
}

/**
 * A stored file, opened over the page: a picture drawn whole, a PDF in a
 * frame, and anything else offered as a download — a Word document is not
 * something a browser can draw, and saying so beats a frame of gibberish.
 *
 * A plain `useQuery` keyed on the reference, for the reason the avatar gives:
 * a file is something somebody looks at beside a record, not a record, and
 * there is nothing for a collection to hold. Asked for only when opened, so a
 * documents tab of four files costs nothing until one is clicked. The object
 * URL is kept for the session, not revoked on close: revoked, StrictMode's
 * second effect pass pulls it out from under the frame showing it.
 */
export function FileViewer({
  file,
  onClose,
}: {
  file: ViewedFile | null
  onClose: () => void
}) {
  const ref = fileRef(file?.value)
  const publicUrl = ref && 'url' in ref ? ref.url : undefined
  const name = file?.name ?? ''

  const loaded = useQuery({
    queryKey: ['file', file?.value],
    enabled: Boolean(file && ref && !publicUrl),
    queryFn: async () => {
      const blob =
        ref && 'download' in ref
          ? await usersService.download(ref.download)
          : await requestBlob((ref as { api: string }).api)
      const kind = fileKind(name, blob.type)
      // A download arrives as `octet-stream` more often than not, and a frame
      // will not draw a PDF it has not been told is one.
      const typed =
        blob.type && blob.type !== 'application/octet-stream'
          ? blob
          : new Blob([blob], { type: mimeFor(kind, name) })
      return { blob: typed, kind, url: URL.createObjectURL(typed) }
    },
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
    networkMode: 'always',
  })

  const src = publicUrl ?? loaded.data?.url
  const kind = loaded.data?.kind ?? fileKind(name)

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-4xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg font-extrabold">{file?.title}</DialogTitle>
          <DialogDescription className="truncate">{name}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-48 flex-1 place-items-center overflow-auto rounded-lg bg-ground">
          {!ref ? (
            <Unshown body="There is no file on record for this." />
          ) : !publicUrl && loaded.isPending ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" strokeWidth={2} />
          ) : !publicUrl && loaded.isError ? (
            <Unshown
              title="The school could not hand this file over"
              body={errorMessage(loaded.error, OFFLINE_MESSAGE)}
            />
          ) : kind === 'image' ? (
            <img
              src={src}
              alt={file?.title}
              className="max-h-[72dvh] w-auto max-w-full object-contain"
            />
          ) : kind === 'pdf' ? (
            <iframe src={src} title={file?.title} className="h-[72dvh] w-full rounded-lg bg-white" />
          ) : (
            <Unshown body="This kind of file cannot be shown in the browser. Download it to open it on this device." />
          )}
        </div>

        {src && (
          <DialogFooter>
            {/* A phone's browser often draws no PDF inside a page; its own
                viewer, in a tab of its own, does. */}
            <Button asChild variant="outline">
              <a href={src} target="_blank" rel="noopener">
                <ExternalLink className="size-4" strokeWidth={2} />
                Open in a new tab
              </a>
            </Button>
            {loaded.data ? (
              <Button onClick={() => saveBlob(loaded.data.blob, name)}>
                <Download className="size-4" strokeWidth={2} />
                Download
              </Button>
            ) : (
              <Button asChild>
                <a href={src} download={name}>
                  <Download className="size-4" strokeWidth={2} />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Unshown({ title, body }: { title?: string; body: string }) {
  return (
    <div className="max-w-sm px-6 py-10 text-center">
      <FileQuestion className="mx-auto size-7 text-muted-foreground" strokeWidth={1.8} />
      {title && <p className="mt-3 font-semibold">{title}</p>}
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
