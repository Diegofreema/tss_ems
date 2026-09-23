import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Underline,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * One control. `type="button"` is not decoration — the toolbar sits inside the
 * record form, and a button without it submits the form on the first attempt
 * to make a word bold.
 */
function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The caret is put back by the command itself; this is what stops the
      // browser taking the selection away before the command reads it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(active && 'bg-muted text-foreground')}
    >
      {children}
    </Button>
  )
}

/**
 * Hidden on a narrow screen: the bar wraps there, and a rule that has landed
 * at the end of a row separates a group from nothing.
 */
function Divider() {
  return (
    <span aria-hidden className="mx-0.5 hidden h-4 w-px shrink-0 self-center bg-divider sm:block" />
  )
}

/** The address box behind the link button, so a URL is typed rather than prompted for. */
function LinkTool({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  const apply = () => {
    const url = href.trim()
    setOpen(false)
    if (!url) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setHref('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="Add a link"
          aria-label="Add a link"
          aria-pressed={active}
          onMouseDown={(event) => event.preventDefault()}
          // Opening on a link that is already there offers what it points at
          // rather than an empty box.
          onClick={() => setHref(String(editor.getAttributes('link').href ?? ''))}
          className={cn(active && 'bg-muted text-foreground')}
        >
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-2">
        <Input
          autoFocus
          value={href}
          placeholder="https://"
          aria-label="Web address"
          onChange={(event) => setHref(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            // Inside the record form, so the key has to be stopped from
            // submitting it.
            event.preventDefault()
            apply()
          }}
        />
        <Button type="button" size="sm" onClick={apply}>
          Link it
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/**
 * The bar over a rich-text field.
 *
 * Every button's lit state is read through `useEditorState`, which re-renders
 * this strip on a selection change and nothing else on the page with it.
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      paragraph: editor.isActive('paragraph'),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      quote: editor.isActive('blockquote'),
      left: editor.isActive({ textAlign: 'left' }),
      centre: editor.isActive({ textAlign: 'center' }),
      right: editor.isActive({ textAlign: 'right' }),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-divider bg-muted/40 px-1.5 py-1"
    >
      <Tool label="Paragraph" active={state.paragraph} onClick={() => chain().setParagraph().run()}>
        <Pilcrow />
      </Tool>
      <Tool label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </Tool>
      <Tool label="Sub-heading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </Tool>

      <Divider />

      <Tool label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold />
      </Tool>
      <Tool label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic />
      </Tool>
      <Tool label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline />
      </Tool>
      <Tool label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough />
      </Tool>
      <Tool label="Code" active={state.code} onClick={() => chain().toggleCode().run()}>
        <Code />
      </Tool>

      <Divider />

      <Tool label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List />
      </Tool>
      <Tool label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered />
      </Tool>
      <Tool label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote />
      </Tool>
      <Tool label="Divider" onClick={() => chain().setHorizontalRule().run()}>
        <Minus />
      </Tool>

      <Divider />

      <Tool label="Align left" active={state.left} onClick={() => chain().setTextAlign('left').run()}>
        <TextAlignStart />
      </Tool>
      <Tool label="Centre" active={state.centre} onClick={() => chain().setTextAlign('center').run()}>
        <TextAlignCenter />
      </Tool>
      <Tool label="Align right" active={state.right} onClick={() => chain().setTextAlign('right').run()}>
        <TextAlignEnd />
      </Tool>

      <Divider />

      <LinkTool editor={editor} active={state.link} />
      <Tool
        label="Remove link"
        disabled={!state.link}
        onClick={() => chain().extendMarkRange('link').unsetLink().run()}
      >
        <Link2Off />
      </Tool>
      <Tool
        label="Clear formatting"
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting />
      </Tool>

      <Divider />

      <Tool label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 />
      </Tool>
      <Tool label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 />
      </Tool>
    </div>
  )
}
