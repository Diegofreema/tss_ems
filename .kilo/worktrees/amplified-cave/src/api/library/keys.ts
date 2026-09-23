export const libraryKeys = {
  all: ['library'] as const,
  loans: () => [...libraryKeys.all, 'loans'] as const,
  loan: (id: string) => [...libraryKeys.loans(), id] as const,
  /** The signed-in student's own borrowings — scoped by the token, so no id. */
  mine: () => [...libraryKeys.all, 'mine'] as const,
}
