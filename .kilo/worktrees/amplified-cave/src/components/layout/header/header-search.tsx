import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'

/**
 * The box in the header, on the portal that has something for it to search.
 *
 * It is a door, not a field. It used to be a field — type a surname, press
 * Enter, land on the search page with `?q=` already filled in — and that is
 * one keystroke shorter than this, but it put two search boxes on the screen
 * the moment you arrived: the one you had just typed into, still holding the
 * term, and the page's own beneath it. Whichever you then corrected, the other
 * was wrong. So the header offers the one thing it is good at, which is being
 * the same shape in the same place on every screen, and the searching itself
 * belongs to the page that shows the answers. The page's own box takes focus
 * on arrival, so the term is still typed once.
 *
 * Drawn as the field it replaces, because it is standing where a field stood
 * and a button that looks like a button reads as "submit" rather than "go
 * here". Only the admin portal declares a `searchPath` — the API gives a
 * teacher, a guardian or a student nothing to search across.
 */
export function HeaderSearch({ to }: { to: string }) {
  return (
    <Link
      to={to}
      aria-label="Search the school's registers"
      className="group min-w-0 flex-none cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-hidden md:max-w-96 md:flex-1"
    >
      {/* Narrow, the bar is already the menu button, the bell, the theme and
          whoever is signed in, so the door is the glyph alone — and it has to
          be here, because taking the row out of the rail left a phone with no
          other way to the search at all. */}
      <span className="flex size-10 items-center justify-center gap-3 rounded-lg border border-transparent bg-ui-field text-[15px] text-ui-hint transition-colors group-hover:border-divider md:h-10 md:w-full md:justify-start md:px-4">
        <Search className="size-4.5 flex-none" strokeWidth={1.9} aria-hidden="true" />
        <span className="hidden truncate md:inline">Search for anything</span>
      </span>
    </Link>
  )
}
