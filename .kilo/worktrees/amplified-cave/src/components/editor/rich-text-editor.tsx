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
  minHeightClass = 'min-h-52',
  brief = false,
}: {
  id?: string
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
  /**
   * How tall the writing area starts. A record form wants a body's worth; the
   * reply box at the foot of a conversation wants two lines, and a form-sized
   * one there pushed the conversation itself off the screen.
   */
  minHeightClass?: string
  /**
   * The short toolbar — bold, italic, a list and a link. For a box somebody
   * writes a sentence in rather than a document; see `EditorToolbar`.
   */
  brief?: boolean
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
        class: `rich-text ${minHeightClass} px-3 py-2.5 outline-none`,
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
    if (!editor || editor.isDestroyed) return
    // An empty field is stored as the empty string while the editor's own way
    // of saying the same thing is `<p></p>`, so the two are compared as the
    // documents they are rather than as text.
    if (value === editor.getHTML() || (!value && editor.isEmpty)) return
    /*
     * A value arriving from outside while somebody is typing is not put in —
     * replacing the document under them throws the caret to the top
     * mid-sentence. An emptied one is the exception, and the reply box at the
     * foot of a conversation is why: it sends on Ctrl+Enter without ever
     * leaving the editor, so the box it had just emptied stayed full of the
     * reply that had already gone. There is no sentence to keep the caret in
     * when the new value is nothing.
     */
    if (editor.isFocused && value) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20',
      )}
    >
      {editor && <EditorToolbar editor={editor} brief={brief} />}
      <EditorContent editor={editor} />
    </div>
  )
}
