import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'

/**
 * What a rich-text field is allowed to hold — the same list for writing it and
 * for reading it back.
 *
 * Sharing one list is what makes the read-only view safe. A stored body is
 * parsed against this schema before it is drawn, so anything not named here —
 * a script tag, an inline handler, a style attribute — is dropped on the way
 * in rather than trusted because the school sent it. Rendering the markup
 * straight into the page would be the same component with an XSS hole in it.
 *
 * H1 is left out: the record's own heading is the page's, and a body that can
 * out-shout it reads as a second page rather than a section of this one.
 */
export function richExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        defaultProtocol: 'https',
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: placeholder ?? '' }),
  ]
}
