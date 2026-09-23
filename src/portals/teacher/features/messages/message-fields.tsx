import type { FieldValues, Path } from 'react-hook-form'
import { RichTextField } from '@/components/form/rich-text-field'
import { TextField } from '@/components/form/text-field'

/**
 * The two fields both endpoints take: `subject` and `message`.
 *
 * `message` is written in the rich-text editor rather than a textarea, so what
 * leaves here is HTML — headings, lists, emphasis and links, against the one
 * schema in `@/components/editor/extensions`. An emptied editor is stored as
 * the empty string rather than the `<p></p>` it hands back, so `min(1)` in the
 * schema is enough to require it.
 */
export function MessageFields<TValues extends FieldValues>({
  bodyHint,
}: {
  bodyHint: string
}) {
  return (
    <>
      <TextField<TValues>
        name={'subject' as Path<TValues>}
        label="Subject"
        required
        placeholder="One line — what this is about"
      />
      <RichTextField<TValues>
        name={'message' as Path<TValues>}
        label="Message"
        required
        hint={bodyHint}
        placeholder="Write your message…"
      />
    </>
  )
}
