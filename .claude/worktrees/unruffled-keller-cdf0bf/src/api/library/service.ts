import { request, toFormData } from '../client'
import type { Id } from '../types'
import type { Book, BookBody, BookSearchParams, BorrowedBook, LendBookBody } from './types'

export const libraryService = {
  books: (params: BookSearchParams = {}) =>
    request<{ books: Book[] }>('admins/books', { query: { ...params } }).then(
      (data) => data.books,
    ),

  addBook: (body: BookBody) =>
    request<{ book: Book }>('admins/books', { method: 'POST', form: toFormData(body) }),

  updateBook: (id: Id, body: BookBody) =>
    request<{ book: Book }>(`admins/books/${id}`, { method: 'POST', form: toFormData(body) }),

  /** Answers under `loans` — `books` reads undefined and the tab renders empty. */
  borrowed: () =>
    request<{ loans: BorrowedBook[] }>('admins/borrowed-books').then((data) => data.loans),

  /** Refused if the copy is already out. */
  lend: (id: Id, body: LendBookBody) =>
    request<unknown>(`admins/books/${id}/lend`, { method: 'POST', body }),

  /** Closes the loan and puts the copy back on the shelf. */
  returnBook: (id: Id) => request<unknown>(`admins/books/${id}/return`, { method: 'POST' }),
}
