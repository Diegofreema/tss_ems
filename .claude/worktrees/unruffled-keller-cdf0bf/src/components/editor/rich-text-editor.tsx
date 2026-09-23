import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { EditorToolbar } from './editor-toolbar'
import { richExtensions } from './extensions'

/**
 * A body written rather than typed — headings, lists, emphasis and links,
 * stored as HTML.
 *
 * The value is held by the form, not by the editor: every keystroke hands the
 * markup back out, and a value that changes from outside — a record arriving
 * after the form mounted, or a reset — is put back in. That is skipped while
 * the caret is in the document, where replacing it would throw the cursor to
 * the top mid-sentence.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  invalid,
}: {
  id?: string
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
}) {
  // Held still across renders on purpose: tiptap compares the extensions it
  // was given one by one, so a fresh array every render reads as a different
  // editor and tears the live one down mid-keystroke.
  const extensions = useMemo(() => richExtensions(placeholder), [placeholder])
  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: 'rich-text min-h-[13rem] px-3 py-2.5 outline-none',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  useEffect(() => {
    // A destroyed editor has no schema, and reading the document off one
    // throws rather than answering — which React's development double-mount
    // does reach: the instance this effect closed over is torn down before it
    // runs again.
    if (!editor || editor.isDestroyed || editor.isFocused) return
    // An empty field is stored as the empty string while the editor's own way
    // of saying the same thing is `<p></p>`, so the two are compared as the
    // documents they are rather than as text.
    if (value === editor.getHTML() || (!value && editor.isEmpty)) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20',
      )}
    >
      {editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
