export type Book = {
  id: number
  title: string
  author: string
  pubdate: string | null
  /** The API spells availability as a word, not a boolean. */
  isavailable: 'Available' | 'Unavailable'
  date_created: string
  user_id: number
  isbn: string | null
  coverphoto: string | null
  copies: number
  section: string | null
  callno: number | string | null
  department_id: number | null
}

/** Substring match on each field; all three are optional. */
export type BookSearchParams = {
  booktitle?: string
  bookauthor?: string
  isbn?: string
}

/** `bookimage` is the cover upload, so this goes out as multipart. */
export type BookBody = {
  title?: string
  author?: string
  isbn?: string
  isavailable?: Book['isavailable']
  department_id?: number
  copies?: number
  callno?: number | string
  section?: string
  pubdate?: string
  bookimage?: File
}

export type BorrowedBook = Record<string, unknown>

export type LendBookBody = {
  student_id: number
  /** YYYY-MM-DD. */
  datetoreturn: string
}
