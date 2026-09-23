export const paymentKeys = {
  all: ['credo'] as const,
  config: () => [...paymentKeys.all, 'config'] as const,
  status: (reference: string) => [...paymentKeys.all, 'status', reference] as const,
}
