import { Download } from 'lucide-react'
import { useState } from 'react'
import { type FieldValues, type Path, useController, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { FileTemplate } from '@/features/collections/types'
import { saveBlob } from '@/lib/download'
import { DropZone } from './drop-zone'
import { FieldShell, type FieldSpan } from './field-shell'

/**
 * A file picked off the machine, held on the form as the `File` itself so the
 * multipart body can append it unchanged.
 *
 * A drop target rather than a bare `<input type="file">`, because that input
 * says nothing about what it will take and nothing about what was chosen — and
 * the one form in this app that uses it uploads a spreadsheet whose shape
 * cannot be checked until the office reads it. The real input is still there
 * underneath, so the field is worked from the keyboard exactly as before; see
 * `DropZone`.
 *
 * The `File` is read back off the form here, which the bare input could not do
 * — a file input's value cannot be set from code, since a page that could
 * write one could read any path it liked. Holding it in form state instead is
 * what lets the zone name the file, and what lets it be taken off again.
 */
export function FileField<TValues extends FieldValues>({
  name,
  label,
  accept,
  hint,
  required,
  span,
  template,
}: {
  name: Path<TValues>
  label: string
  /** The `accept` attribute — narrows the picker to what the endpoint takes. */
  accept?: string
  hint?: string
  required?: boolean
  span?: FieldSpan
  /** A file to start from, where the endpoint expects a particular shape. */
  template?: FileTemplate
}) {
  const { control, getValues } = useFormContext<TValues>()
  const { field, fieldState } = useController({ control, name })
  const error = fieldState.error?.message

  return (
    <FieldShell
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      span={span}
    >
      <DropZone
        id={name}
        accept={accept}
        invalid={Boolean(error)}
        // `field.value` is typed by the form's shape, which for a file field
        // is whatever the collection declared; the check is what makes it a
        // `File` here rather than the assertion doing it.
        file={(field.value as unknown) instanceof File ? (field.value as File) : undefined}
        onFile={(chosen) => {
          field.onChange(chosen)
          field.onBlur()
        }}
      />
      {template && <TemplateButton template={template} values={getValues} />}
    </FieldShell>
  )
}

/**
 * Downloads the file the endpoint expects, already shaped.
 *
 * It is here rather than in a hint because the shape of an uploaded sheet is
 * the one thing on a form nobody can check before it is sent: the wrong
 * columns come back days later as a batch the office rejected. Handing over
 * the sheet is the only way to be sure.
 *
 * Built on the press, not on render, so it reads whatever has been chosen on
 * the form by then — the arm decides whose names are in it.
 */
function TemplateButton({
  template,
  values,
}: {
  template: FileTemplate
  values: () => FieldValues
}) {
  const [building, setBuilding] = useState(false)

  const download = async () => {
    setBuilding(true)
    try {
      const { file, filename } = await template.build(values())
      saveBlob(file, filename)
    } catch {
      toast.error('That template could not be built. Try again once this page has loaded fully.')
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="mt-2">
      <Button type="button" variant="outline" size="sm" pending={building} onClick={download}>
        <Download className="size-3.5" strokeWidth={2} />
        {template.label}
      </Button>
      {template.note && (
        <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
          {template.note}
        </p>
      )}
    </div>
  )
}
