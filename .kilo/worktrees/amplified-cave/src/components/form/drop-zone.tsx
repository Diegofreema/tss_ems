import { FileUp, Paperclip, X } from 'lucide-react'
import { useState } from 'react'
import { useDropzone, type Accept, type FileError } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Picking a file, by dropping it or by choosing it.
 *
 * A file input is the one control on these forms that gives no sense of what
 * it will take, and the results upload is the worst case of it: a teacher who
 * picks the wrong workbook finds out days later, when the office rejects the
 * batch. So the target says what it accepts before anything is chosen, names
 * what was chosen afterwards, and turns down a file it can see is wrong at the
 * moment it lands rather than at the moment it is sent.
 *
 * The real `<input type="file">` is still underneath — `getInputProps` renders
 * it — so this is a keyboard control and a screen-reader control before it is
 * a drop target. That matters more than the dropping does: on the school
 * machines this runs on, half the people using it will tab into it.
 */
export function DropZone({
  id,
  file,
  onFile,
  accept,
  invalid,
  disabled,
}: {
  id: string
  /** What is chosen, so the zone can name it. */
  file?: File
  onFile: (file: File | undefined) => void
  /** The `accept` attribute as a field spec writes it — `.csv,.xls,.xlsx`. */
  accept?: string
  invalid?: boolean
  disabled?: boolean
}) {
  /*
   * Held here rather than read off the hook's own `fileRejections`, which keep
   * the last refusal until something else is dropped: a teacher who dropped
   * the wrong file, then took the right one off again, was left reading a
   * complaint about a file that is no longer anywhere on the form.
   */
  const [refused, setRefused] = useState<FileError | undefined>()

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: acceptMap(accept),
    // One file: every endpoint behind this takes exactly one, and a teacher
    // who drops three should be told so rather than have two dropped silently
    // on the floor.
    multiple: false,
    maxFiles: 1,
    disabled,
    onDrop: (accepted, rejected) => {
      setRefused(rejected[0]?.errors[0])
      // Only on an accepted file: a refused drop leaves whatever was already
      // chosen alone, rather than emptying the field as a punishment for it.
      if (accepted[0]) onFile(accepted[0])
    },
  })

  const clear = () => {
    setRefused(undefined)
    onFile(undefined)
  }

  return (
    <div>
      <div
        {...getRootProps()}
        aria-invalid={invalid || undefined}
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-7 text-center transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          isDragReject
            ? 'border-danger bg-danger-subtle'
            : isDragActive
              ? 'border-brand bg-brand/10'
              : 'border-divider-strong bg-background hover:border-brand hover:bg-brand/5',
          invalid && !isDragActive && 'border-destructive',
          disabled && 'pointer-events-none opacity-55',
        )}
      >
        <input {...getInputProps({ id })} />

        <div
          className={cn(
            'grid size-10 place-items-center rounded-lg transition-colors',
            isDragReject
              ? 'bg-danger text-white'
              : isDragActive
                ? 'bg-brand text-white'
                : 'bg-brand/10 text-brand-700',
          )}
        >
          <FileUp className="size-5" strokeWidth={1.9} />
        </div>

        <div className="text-sm">
          {isDragReject ? (
            <span className="font-medium text-danger-ink">
              That kind of file is not accepted
            </span>
          ) : isDragActive ? (
            <span className="font-medium text-brand-700">Drop it here</span>
          ) : (
            <>
              <span className="font-medium">Drop a file here</span>
              <span className="text-muted-foreground">, or click to choose one</span>
            </>
          )}
        </div>

        {accept && !isDragActive && (
          <div className="text-2xs uppercase tracking-label text-muted-foreground">
            {/* Separated rather than joined with a word: this line is set in
                caps, and "OR" in the middle of it shouts. */}
            {kinds(accept).join(' \u00b7 ')}
          </div>
        )}
      </div>

      {/* What was chosen. A file input shows this itself; a drop target has to
          say it, and it is the only confirmation that the drop landed. */}
      {file && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-divider bg-raised px-3.5 py-2.5 shadow-card">
          <Paperclip className="size-3.75 flex-none text-brand-700" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="text-2xs text-muted-foreground">{size(file.size)}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${file.name}`}
            onClick={clear}
          >
            <X className="size-3.5" strokeWidth={2.2} />
          </Button>
        </div>
      )}

      {refused && (
        <p className="mt-2 text-xs text-danger-ink">
          {refused.code === 'file-invalid-type'
            ? `That file is not one this takes — ${readable(accept)}.`
            : refused.code === 'too-many-files'
              ? 'One file at a time.'
              : refused.message}
        </p>
      )}
    </div>
  )
}

/**
 * The `accept` string a field spec writes, as react-dropzone wants it.
 *
 * The library keys its map by MIME type and lists extensions under it, where a
 * spec writes the extensions a person recognises. Both halves are needed: the
 * MIME type is what the operating system's picker filters on, and the
 * extension is what the browser matches a dropped file against — a `.xlsx`
 * dragged out of some file managers arrives with no type at all.
 */
function acceptMap(accept?: string): Accept | undefined {
  if (!accept) return undefined

  const map: Record<string, string[]> = {}
  for (const raw of accept.split(',')) {
    const part = raw.trim()
    if (!part) continue
    if (part.startsWith('.')) {
      const mime = MIME[part.toLowerCase()] ?? 'application/octet-stream'
      map[mime] = [...(map[mime] ?? []), part.toLowerCase()]
    } else {
      // Already a MIME type — `image/*` and friends pass straight through.
      map[part] = map[part] ?? []
    }
  }
  return Object.keys(map).length > 0 ? map : undefined
}

/** The extensions this app's forms actually ask for. */
const MIME: Record<string, string> = {
  '.csv': 'text/csv',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

/** The accepted kinds, as a person names them: `.xlsx` reads as XLSX. */
function kinds(accept?: string): string[] {
  return (accept ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith('.') ? part.slice(1).toUpperCase() : part))
}

/** The same, as a sentence — for the refusal, which is not set in caps. */
function readable(accept?: string): string {
  const parts = kinds(accept)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} or ${parts.at(-1)}`
}

/** A file size a person reads, rather than a number of bytes. */
function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
