import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '../types'
import { libraryKeys } from './keys'
import { libraryService } from './service'
import type { BookBody, BookSearchParams, LendBookBody } from './types'

export function useBooks(params: BookSearchParams = {}) {
  return useQuery({
    queryKey: libraryKeys.books(params),
    queryFn: () => libraryService.books(params),
  })
}

export function useAddBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BookBody) => libraryService.addBook(body),
    meta: { success: 'Book added' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  })
}

export function useUpdateBook(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BookBody) => libraryService.updateBook(id, body),
    meta: { success: 'Book updated' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  })
}

export function useBorrowedBooks() {
  return useQuery({
    queryKey: libraryKeys.borrowed(),
    queryFn: () => libraryService.borrowed(),
  })
}

/** Lending changes both the loan list and the copy's availability. */
export function useLendBook(id: Id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: LendBookBody) => libraryService.lend(id, body),
    meta: { success: 'Book lent out' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  })
}

export function useReturnBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => libraryService.returnBook(id),
    meta: { success: 'Book returned' },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  })
}
