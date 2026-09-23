import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { richExtensions } from './extensions'

/**
 * A stored body, read rather than written.
 *
 * Drawn through the editor itself with typing turned off, which is what keeps
 * the two identical — a heading is the same size on the record page as it was
 * in the form — and is also the sanitiser: the markup is parsed against the
 * schema in `richExtensions` rather than set as HTML on an element.
 */
export function RichTextView({ html, className }: { html: string; className?: string }) {
  // Same as the editor's: a new array each render would rebuild this one too.
  const extensions = useMemo(() => richExtensions(), [])
  const editor = useEditor(
    {
      extensions,
      content: html,
      editable: false,
      editorProps: { attributes: { class: 'rich-text' } },
    },
    // Re-read where the record changes under it, which a detail page does
    // when the next record is opened from the same route.
    [html],
  )

  if (!editor) return null
  return <EditorContent editor={editor} className={cn('text-sm', className)} />
}
