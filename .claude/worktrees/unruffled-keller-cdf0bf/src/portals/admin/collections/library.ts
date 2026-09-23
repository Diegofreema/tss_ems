import { libraryService } from '@/api/library/service'
import type { Book } from '@/api/library/types'
import { pageRows } from '@/features/collections/api'
import type { CollectionDef } from '@/features/collections/types'
import { queryClient } from '@/lib/query-client'
import { bookBody } from './book-body'
import { bookRow } from './book-row'

/**
 * The catalogue, whole.
 *
 * `GET /admins/books` answers with every title and ignores `page` and `limit`,
 * so the page is searched and paged here — which also means the search box
 * matches on every column rather than the one field a query parameter would
 * narrow. The endpoint's own `booktitle`, `bookauthor` and `isbn` parameters
 * are AND-ed together, so a single box could not have been passed to all three.
 *
 * The list and both count tiles want the same answer on the same render, so it
 * is asked for through the cache: react-query collapses the concurrent calls
 * into one request. Nothing is held between renders — the catalogue is refetched
 * on the next visit, and after a save.
 */
const allBooks = (): Promise<Book[]> =>
  queryClient.ensureQueryData({ queryKey: ['library', 'all'], queryFn: () => libraryService.books() })

const catalogue = () => allBooks().then((books) => books.map(bookRow))

const countBooks = (available?: Book['isavailable']) => async () => {
  const books = await allBooks()
  return available ? books.filter((book) => book.isavailable === available).length : books.length
}

const countOnLoan = async () => (await libraryService.borrowed()).length

export const library: CollectionDef = {
  id: 'library',
  path: '/admin/library',
  kicker: 'School',
  title: 'Library',
  description:
    'Every title the school holds, and how many of it. Open a title to issue a copy to a pupil.',
  action: 'Add book',
  searchHint: 'Search title, author, ISBN or section',
  footer: 'School catalogue',
  emptyTitle: 'The catalogue is empty',
  emptyBody: 'Add your first title to start lending books to pupils.',
  noun: 'title',
  nameKey: 'title',
  counts: [
    { label: 'Titles', count: countBooks() },
    { label: 'On the shelf', count: countBooks('Available') },
    { label: 'On loan', count: countOnLoan },
  ],
  columns: [
    { key: 'title', label: 'Title', cardRole: 'title' },
    { key: 'author', label: 'Author', cardRole: 'subtitle' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'section', label: 'Section' },
    { key: 'copies', label: 'Copies', align: 'right' },
    { key: 'isavailable', label: 'Availability', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'isavailable', label: 'Availability' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'section', label: 'Section' },
    { key: 'callno', label: 'Call number' },
    { key: 'copies', label: 'Copies held' },
    { key: 'pubdate', label: 'Published' },
    { key: 'added', label: 'Added to the catalogue' },
  ],
  source: async (params) => pageRows(await catalogue(), params),
  // There is no endpoint for one book, so the record is found in the
  // catalogue the list already asked for — react-query answers it from cache.
  record: async (recordId) =>
    (await catalogue()).find((book) => book.id === String(recordId)),
  save: async (values, recordId) => {
    const saved = recordId
      ? await libraryService.updateBook(recordId, bookBody(values))
      : await libraryService.addBook(bookBody(values))
    // The collection's own invalidation does not reach the shared catalogue
    // the tiles and the record page read, so the new title would not appear.
    await queryClient.invalidateQueries({ queryKey: ['library'] })
    return saved
  },
  form: [
    {
      title: 'Book',
      fields: [
        { key: 'title', label: 'Title', required: true, wide: true, placeholder: 'Things Fall Apart' },
        { key: 'author', label: 'Author', required: true, wide: true, placeholder: 'Chinua Achebe' },
        { key: 'isbn', label: 'ISBN', placeholder: '978-0435925' },
        {
          key: 'pubdate',
          label: 'Published',
          placeholder: '2011',
          hint: 'A year, or a full date where the school holds one.',
        },
        {
          key: 'bookimage',
          label: 'Cover',
          file: 'image/*',
          wide: true,
          hint: 'Optional. On an edit, leaving this empty keeps the cover already on file.',
        },
      ],
    },
    {
      title: 'On the shelf',
      fields: [
        { key: 'copies', label: 'Copies held', required: true, numeric: true, placeholder: '40' },
        { key: 'section', label: 'Section', placeholder: 'Computer science' },
        { key: 'callno', label: 'Call number', placeholder: '45' },
        { key: 'department_id', label: 'Class', optionsFrom: 'classes' },
        {
          key: 'isavailable',
          label: 'Availability',
          options: ['Available', 'Unavailable'],
          hint: 'Unavailable takes the title off lending without removing it.',
        },
      ],
    },
  ],
}
