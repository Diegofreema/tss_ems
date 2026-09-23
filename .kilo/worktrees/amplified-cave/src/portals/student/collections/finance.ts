import { heldDocument } from '@/db/collection'
import { schoolingInvoices } from '@/db/collections/schooling'
import { pageRows } from '@/features/collections/api'
import { localFirst } from '@/features/collections/local-first'
import type { CollectionDef } from '@/features/collections/types'
import { formatNaira } from '@/lib/format'
import { feeCounts, invoiceRows, paidTotal, paymentRows } from '../features/fees/fees'

/**
 * The student's fee ledger, from `GET /students/me/invoices` — one answer
 * carrying both the bills and the payments taken against them.
 *
 * Through the cache rather than fetched per panel: the list, the record it
 * opens, the payments tab beside it and all three tiles want the same answer
 * on the same render, and react-query collapses them into one call.
 */
/**
 * A ledger with nothing on it stands in for one this device holds nothing of:
 * every reader below already treats no bills as no bills. A set that never
 * synced refuses inside `heldDocument`, and that refusal is what puts the page
 * into its "could not load" state rather than showing a student a clean sheet.
 */
const ledger = async () =>
  (await heldDocument(schoolingInvoices)) ?? { invoices: [], transactions: [] }

const rows = () => ledger().then((data) => invoiceRows(data.invoices, data.transactions))

export const invoices: CollectionDef = {
  id: 'invoices',
  path: '/student/invoices',
  kicker: 'Finance',
  title: 'My invoices',
  description:
    'Every fee raised against your record and what has been paid on each. This is the same ledger the bursary keeps — the reference on a settled bill is the one to quote if a payment is ever questioned.',
  // No button. The design's was "Download receipt", and a student login can
  // reach no receipt endpoint; what a receipt would say — the reference, the
  // method, the bursary's own note — is on the record panel instead.
  action: 'Download receipt',
  readonly: true,
  searchHint: 'Search invoice or fee',
  footer: 'Newest first, across every session',
  emptyTitle: 'No invoices raised',
  emptyBody: 'Fees the school raises against your record appear here, settled or not.',
  noun: 'invoice',
  nameKey: 'invoice',
  counts: [
    {
      label: 'Paid',
      count: () => ledger().then((data) => paidTotal(data.invoices)),
      format: formatNaira,
    },
    {
      label: 'Unpaid',
      count: () => ledger().then((data) => feeCounts(data.invoices).unpaid),
    },
    {
      label: 'Raised for you',
      count: () => ledger().then((data) => feeCounts(data.invoices).total),
    },
  ],
  columns: [
    { key: 'invoice', label: 'Invoice', cardRole: 'title' },
    { key: 'fee', label: 'Fee', cardRole: 'subtitle' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'paid', label: 'Paid', align: 'right' },
    { key: 'method', label: 'Method' },
    { key: 'state', label: 'State', tag: true, cardRole: 'tag' },
  ],
  // The panel says more than the table has room for: which session the bill
  // belongs to, when it was raised, and the reference on the payment.
  detail: [
    { key: 'invoice', label: 'Invoice' },
    { key: 'fee', label: 'Fee' },
    { key: 'session', label: 'Session' },
    { key: 'amount', label: 'Amount' },
    { key: 'paid', label: 'Paid' },
    { key: 'state', label: 'State' },
    { key: 'method', label: 'Method' },
    { key: 'payref', label: 'Payment reference' },
    { key: 'raised', label: 'Raised' },
    { key: 'settledOn', label: 'Settled' },
  ],
  tabs: [
    {
      label: 'Payments',
      columns: [
        { key: 'paidOn', label: 'Paid on' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'method', label: 'Method' },
        { key: 'payref', label: 'Reference' },
        { key: 'note', label: 'Office note' },
      ],
      source: (recordId) => ledger().then((data) => paymentRows(data.transactions, recordId)),
      empty: 'Nothing has been taken against this invoice yet.',
    },
  ],
  // Read off the device. `invoiceRows` puts the newest first, as the footer
  // says; the payments taken against the bills arrive in the same answer,
  // which is why the whole ledger is kept rather than the bills alone.
  collection: localFirst({
    entities: schoolingInvoices,
    rows: (kept) =>
      kept[0] ? invoiceRows(kept[0].doc.invoices, kept[0].doc.transactions) : [],
  }),
  source: (params) => rows().then((all) => pageRows(all, params)),
  record: (recordId) => rows().then((all) => all.find((row) => row.id === recordId)),
}
