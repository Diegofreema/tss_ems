import type { Book } from '@/api/library/types';
import { heldRows } from '@/db/collection';
import { refBooks } from '@/db/collections/reference';
import { pageRows } from '@/features/collections/api';
import { localFirst } from '@/features/collections/local-first';
import { byId } from '@/features/collections/order';
import { BLANK } from '@/features/collections/blank';
import { freeCopies, lendingLabel } from '@/features/library/book-read';
import type { CollectionDef, Row } from '@/features/collections/types';
import { when } from '@/features/collections/when';

/**
 * The shelf itself, off `GET /admins/books` — every title the school holds,
 * with the copies and whether it still lends. The borrowings against it are
 * the Lending page (`./loans`).
 *
 * The endpoint answers whole and ignores paging, so the catalogue is one set on
 * the device, searched and paged here. It is the same set the lending flow's
 * title picker offers, so the two read one copy between them.
 */
const allBooks = (): Promise<Book[]> => heldRows(refBooks);

function text(value: string | number | null | undefined): string {
  const written = String(value ?? '').trim();
  return written || BLANK;
}

function bookRow(book: Book): Row {
  return {
    id: String(book.id),
    title: book.title,
    author: text(book.author),
    section: text(book.section),
    copies: String(book.copies),
    // Through the reader, never straight off the row: `isavailable` is a
    // number on this deployment and was a word until 2026-09-15, and a number
    // handed to the table's column reader is what took this page down.
    lending: lendingLabel(book),
    // Only where the row carries a count. The old worded shape has none, and
    // an em dash is the honest answer rather than a nought.
    onShelf:
      freeCopies(book) === null
        ? BLANK
        : `${freeCopies(book)} of ${book.copies}`,

    // Read by the record panel and the edit flow, not by the table.
    isbn: text(book.isbn),
    pubdate: text(book.pubdate),
    callno: text(book.callno),
    added: when(book.date_created),
  };
}

/**
 * The order the school added them in, stated rather than inherited: a keyed
 * collection hands its rows back in key order, and nothing here promised any
 * other. The search box is how a title is actually found.
 */
const shelved = (books: readonly Book[]) =>
  byId(books).map((book) => bookRow(book));

const shelf = () => allBooks().then(shelved);

export const books: CollectionDef = {
  id: 'books',
  path: '/admin/library',
  // A handful of short fields and no sub-tables: the title opens over the shelf.
  modal: true,
  kicker: 'School',
  title: 'Library',
  description:
    'Every title the school holds — how many copies are on the shelf and whether it still lends. The borrowings against them are on the Lending page.',
  action: 'Add a book',
  searchHint: 'Search title, author or ISBN',
  footer: 'Every title on the shelf',
  emptyTitle: 'No books in the library',
  emptyBody:
    'Add the first title with the button above — it can be issued the moment it is in.',
  noun: 'title',
  nameKey: 'title',
  // Books arrive and change by flow — Add a book, Edit a title — so the
  // rows themselves offer neither pencil nor bin.
  readonly: true,
  tabs: [],
  counts: [
    { label: 'Books', count: async () => (await shelf()).length },
    {
      label: 'Copies held',
      count: async () =>
        (await allBooks()).reduce(
          (sum, book) => sum + (Number(book.copies) || 0),
          0,
        ),
    },
    {
      label: 'Available to lend',
      count: async () =>
        (await shelf()).filter((row) => row.lending === 'Available').length,
    },
  ],
  filters: [
    /*
     * The three standings the count produces, and they are three because the
     * library keeps its last copy back (`RESERVED_COPIES`):
     *
     *   Available   — a copy can go out
     *   Unavailable — one copy free, and it is the reference copy
     *   All out     — every copy is with a borrower, nothing on the shelf
     *
     * A school still on the worded shape sees its own words in the rows; the
     * dropdown offers what the count produces.
     */
    {
      key: 'lending',
      label: 'Any standing',
      options: ['Available', 'Unavailable', 'All out'],
    },
  ],
  columns: [
    { key: 'title', label: 'Title', cardRole: 'title' },
    { key: 'author', label: 'Author', cardRole: 'subtitle' },
    { key: 'section', label: 'Section' },
    { key: 'copies', label: 'Copies', align: 'right' },
    { key: 'lending', label: 'Lending', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'pubdate', label: 'Published' },
    { key: 'section', label: 'Section' },
    { key: 'callno', label: 'Call number' },
    { key: 'copies', label: 'Copies held' },
    { key: 'onShelf', label: 'On the shelf' },
    { key: 'lending', label: 'Lending' },
    { key: 'added', label: 'Added' },
  ],
  collection: localFirst({
    entities: refBooks,
    rows: shelved,
    // Already worked out on the rows rather than sent to the endpoint, which
    // is what lets it move to the device unchanged.
    narrow: (rows, filters) =>
      filters.lending
        ? rows.filter((row) => row.lending === filters.lending)
        : rows,
  }),
  source: async (params) => {
    const rows = await shelf();
    const lending = params.filters.lending;
    return pageRows(
      lending ? rows.filter((row) => row.lending === lending) : rows,
      params,
    );
  },
  record: async (recordId) =>
    (await shelf()).find((row) => row.id === recordId),
};
