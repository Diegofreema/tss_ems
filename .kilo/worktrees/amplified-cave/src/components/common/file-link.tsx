import { Download, Loader2 } from 'lucide-react'
import { useDownloadFile } from '@/api/users/hooks'
import { BLANK } from '@/features/collections/blank'
import { cn } from '@/lib/utils'

/**
 * A stored file, named and fetchable. These endpoints want the bearer token,
 * so the file cannot be an ordinary link — it is fetched and then saved, which
 * is what the click does.
 */
export function FileLink({
  name,
  className,
}: {
  /** The stored filename. Empty means the family never supplied this one. */
  name: string
  className?: string
}) {
  const download = useDownloadFile(name)

  if (!name || name === BLANK) {
    return <span className="text-muted-foreground">{BLANK}</span>
  }

  return (
    <button
      type="button"
      disabled={download.isPending}
      onClick={(event) => {
        // The row around it usually does something of its own.
        event.stopPropagation()
        download.mutate()
      }}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 text-brand underline-offset-2 hover:underline disabled:cursor-wait disabled:no-underline disabled:opacity-60',
        className,
      )}
    >
      {download.isPending ? (
        <Loader2 className="size-3.25 animate-spin" strokeWidth={2.2} />
      ) : (
        <Download className="size-3.25" strokeWidth={2.2} />
      )}
      {name}
    </button>
  )
}
