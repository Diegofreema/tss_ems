import type { BookSearchParams } from './types'

export const libraryKeys = {
  all: ['library'] as const,
  books: (params: BookSearchParams) => [...libraryKeys.all, 'books', params] as const,
  borrowed: () => [...libraryKeys.all, 'borrowed'] as const,
}
