import type { Id } from '../types'
import type { CollectionsReportParams, FindStudentParams, OutstandingParams } from './types'

export const collectFeeKeys = {
  all: ['collect-fees'] as const,
  outstanding: (params: OutstandingParams) =>
    [...collectFeeKeys.all, 'outstanding', params] as const,
  paymentMethods: () => [...collectFeeKeys.all, 'payment-methods'] as const,
  stats: () => [...collectFeeKeys.all, 'stats'] as const,
  ledger: (studentId: Id, all: boolean) =>
    [...collectFeeKeys.all, 'ledger', String(studentId), all] as const,
  studentSearch: (params: FindStudentParams) =>
    [...collectFeeKeys.all, 'student-search', params] as const,
  receipt: (invoiceId: Id) => [...collectFeeKeys.all, 'receipt', String(invoiceId)] as const,
  report: (params: CollectionsReportParams) => [...collectFeeKeys.all, 'report', params] as const,
}
