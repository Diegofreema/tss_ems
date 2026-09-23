import { sessionsService } from '@/api/calendar/service'
import { paymentMethods } from '@/api/collect-fees/hooks'
import { collectFeeKeys } from '@/api/collect-fees/keys'
import { collectFeesService } from '@/api/collect-fees/service'
import { feesService } from '@/api/fees/service'
import type { FeeType } from '@/api/fees/types'
import { invoicesService } from '@/api/invoices/service'
import { spendingsService } from '@/api/spendings/service'
import type { CollectionDef, DetailTab } from '@/features/collections/types'
import { formatNaira } from '@/lib/format'
import { PAGE_SIZE } from '@/hooks/use-list-query'
import { queryClient } from '@/lib/query-client'
import {
  activateAction,
  CHARGE_OPTIONS,
  feeBody,
  feeRow,
} from './fee-row'
import { collectRow, transactionRow } from './collect-row'
import { invoiceBody, invoiceRow, settleAction } from './invoice-row'
import {
  monthKey,
  spendingBody,
  spendingRow,
  spentIn,
  spentInYear,
} from './spending-row'

/**
 * Totals and entry counts per month, from the one endpoint that answers for
 * every month at once. The three tiles above the ledger ask for it together
 * and react-query collapses that into a single request.
 */
const monthlySpend = () =>
  queryClient.ensureQueryData({
    queryKey: ['spendings', 'summary'],
    queryFn: () => spendingsService.summary(),
  })

/**
 * A count the catalogue asks for by listing one row and reading the total off
 * the pagination — there is no endpoint that counts fees without listing them.
 */
const countFees = (status: 0 | 1) => async () =>
  (await feesService.list({ status, limit: 1 })).pagination.total

export const fees: CollectionDef = {
  id: 'fees',
  path: '/admin/fees',
  kicker: 'Finance',
  title: 'Fee catalogue',
  description:
    'Every chargeable fee and what it costs. Allocate one to classes and it is billed to every pupil in them; retire it and invoices already raised stay payable.',
  action: 'Create fee',
  searchHint: 'Search fee name or item code',
  footer: 'Newest first',
  emptyTitle: 'No fees in the catalogue',
  emptyBody:
    'Nothing can be invoiced until at least one fee exists. Create the first one and allocate it to classes.',
  noun: 'fee',
  nameKey: 'name',
  counts: [
    { label: 'Active', count: countFees(1) },
    { label: 'Retired', count: countFees(0) },
  ],
  // No "Allocated to" column: only `GET /fees/{id}` expands what a fee is
  // charged to, so the register would show an empty cell on every row. It is
  // on the record panel, where the API does answer for it.
  columns: [
    { key: 'name', label: 'Fee', cardRole: 'title' },
    { key: 'code', label: 'Item code', cardRole: 'subtitle' },
    { key: 'charge', label: 'Charged to' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: [
    { key: 'name', label: 'Fee' },
    { key: 'amount', label: 'Amount' },
    { key: 'charge', label: 'Charged to' },
    { key: 'status', label: 'Status' },
    { key: 'classes', label: 'Allocated to' },
    { key: 'levels', label: 'Levels' },
    { key: 'code', label: 'Item code' },
    { key: 'remita', label: 'Remita code' },
    { key: 'author', label: 'Created by' },
    { key: 'starts', label: 'Starts' },
    { key: 'ends', label: 'Ends' },
  ],
  filters: [
    {
      key: 'status',
      label: 'Any status',
      options: [
        { value: '1', label: 'Active' },
        { value: '0', label: 'Retired' },
      ],
    },
    { key: 'feetype', label: 'Anyone', options: CHARGE_OPTIONS },
  ],
  // Retiring is two endpoints of its own rather than a field on the fee, and
  // it is the safe alternative to deleting: what is already invoiced stays.
  rowAction: {
    label: (row) => activateAction(row.status).label,
    confirm: (row) =>
      row.status === 'Active'
        ? 'It stops being charged from now on. Invoices already raised against it stay intact and payable.'
        : undefined,
    done: (row) => `${row.name} ${activateAction(row.status).done}`,
    run: (row) =>
      activateAction(row.status).activate
        ? feesService.activate(row.id)
        : feesService.deactivate(row.id),
  },
  source: async ({ page, q, filters }) => {
    const { items, pagination } = await feesService.list({
      page,
      limit: PAGE_SIZE,
      q,
      status: filters.status === '' ? undefined : (Number(filters.status) as 0 | 1),
      feetype: (filters.feetype || undefined) as FeeType | undefined,
    })
    return { items: items.map(feeRow), pagination }
  },
  record: (recordId) => feesService.get(recordId).then(feeRow),
  save: (values, recordId) =>
    recordId
      ? feesService.update(recordId, feeBody(values))
      : feesService.create(feeBody(values)),
  /**
   * Refused with 409 while anything references the fee, and the API says what
   * in the message. Deactivating is almost always what was meant, which is why
   * that is the button on the row.
   */
  remove: (recordId) => feesService.remove(recordId),
  // Allocation is not here: passing `departments` replaces the whole set, so
  // an edit that did not ask about it would silently unallocate the fee.
  form: [
    {
      title: 'The fee',
      fields: [
        {
          key: 'name',
          label: 'Fee name',
          required: true,
          wide: true,
          placeholder: 'TUITION FEE',
          hint: 'Appears on every invoice raised against it, exactly as written.',
        },
        {
          key: 'figure',
          label: 'Amount (₦)',
          required: true,
          money: true,
          placeholder: '30,000',
          hint: 'Charged per pupil, every time this fee is raised.',
        },
        {
          key: 'feetype',
          label: 'Charged to',
          required: true,
          options: CHARGE_OPTIONS,
        },
        {
          key: 'itemcode',
          label: 'Item code',
          placeholder: '10001001',
          hint: 'The school\'s own accounting code. Leave it empty if you do not use one.',
        },
      ],
    },
  ],
}

/**
 * The two words `paystatus` comes back as, offered under the one an office
 * would use. The value is the API's own, since the filter is sent verbatim.
 */
const PAY_STATUS = [
  { value: 'Unpaid', label: 'Unpaid' },
  { value: 'success', label: 'Paid' },
] as const

/**
 * A figure the register asks for by listing one row and reading the count off
 * the pagination — there is no endpoint that counts invoices without listing
 * them.
 */
const countInvoices = (status?: string) => async () =>
  (await invoicesService.list({ status, limit: 1 })).pagination.total

/** What an invoice's own page reads, whichever register opened it. */
const INVOICE_DETAIL = [
  { key: 'invoice', label: 'Reference' },
  { key: 'student', label: 'Pupil' },
  { key: 'arm', label: 'Arm' },
  { key: 'fee', label: 'Fee' },
  { key: 'billed', label: 'Amount' },
  { key: 'paid', label: 'Paid' },
  { key: 'status', label: 'Status' },
  { key: 'session', label: 'Session' },
  { key: 'raised', label: 'Raised' },
  { key: 'settledOn', label: 'Settled' },
]

/**
 * Settling is offered wherever an invoice is listed. It is its own endpoint
 * rather than a field on the invoice, and it names the pupil so a mistyped
 * reference cannot clear someone else's bill. Every part is read off the row,
 * and an invoice already paid gets no button at all.
 */
const settleRow: CollectionDef['rowAction'] = {
  label: (row) => settleAction(row.status),
  confirm: () =>
    'This records the invoice as paid in full and closes its transaction. It keeps no method, discount or reference, and the collections report will not see it — take the payment from Fee collection instead if you can. There is no undoing it from here.',
  done: (row) => `${row.invoice} settled`,
  run: (row) => invoicesService.settle(row.id, { student_id: Number(row.student_id) }),
}

/**
 * The queue's own count of itself. `/collect-fees` sends `stats` beside the
 * page it was asked for, so the three tiles and the list share one request
 * instead of the four the invoice register needs — and the outstanding total
 * is the whole ledger's, not just the page's.
 */
const collectStats = () =>
  queryClient
    .ensureQueryData({
      queryKey: collectFeeKeys.stats(),
      queryFn: () => collectFeesService.outstanding({ limit: 1 }),
    })
    .then((page) => page.stats)

/** Every payment ever taken against one invoice. */
const paymentsTaken: DetailTab = {
  label: 'Payments taken',
  columns: [
    { key: 'taken', label: 'When' },
    { key: 'method', label: 'Method' },
    { key: 'amount', label: 'Collected', align: 'right' },
    { key: 'discount', label: 'Discount', align: 'right' },
    { key: 'payref', label: 'Reference' },
    { key: 'notes', label: 'Note' },
  ],
  empty: 'Nothing has been collected against this invoice yet.',
  source: async (recordId) => {
    const [invoice, methods] = await Promise.all([
      collectFeesService.invoice(recordId),
      paymentMethods().catch(() => undefined),
    ])
    return (invoice.transactions ?? []).map((entry) => transactionRow(entry, methods))
  },
}

/**
 * The rest of the same pupil's bill. A parent at the counter settling one
 * invoice is the moment to know they are also down for the bus, so this asks
 * for every session rather than only the current one.
 */
const pupilLedger: DetailTab = {
  label: "This pupil's invoices",
  columns: [
    { key: 'invoice', label: 'Invoice' },
    { key: 'fee', label: 'Fee' },
    { key: 'session', label: 'Session' },
    { key: 'billed', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status', tag: true },
  ],
  empty: 'This pupil has no other invoices.',
  source: async (recordId) => {
    const invoice = await collectFeesService.invoice(recordId)
    const ledger = await collectFeesService.studentLedger(invoice.student_id)
    return ledger.invoices.map(collectRow)
  },
}

export const collect: CollectionDef = {
  id: 'collect',
  path: '/admin/collect',
  kicker: 'Finance',
  title: 'Fee collection',
  description:
    'The counter queue: every invoice still owing. Open one to take the payment — it is settled in full, less any discount you grant.',
  // Finding a family is the counter's own job and comes first; the report is
  // the end-of-day one.
  action: 'Find a pupil',
  actionTo: '/admin/collect/pupil',
  secondaryTo: { to: '/admin/collect/report', label: 'Collections report' },
  // Unlike the invoice register, this endpoint really does search — `q`
  // matches a pupil's name or registration number.
  searchHint: 'Search pupil name or reg. no.',
  searchable: true,
  footer: 'Newest first',
  emptyTitle: 'Nothing outstanding',
  emptyBody:
    'Every invoice raised has been settled. New ones appear here as fees are charged to pupils.',
  noun: 'invoice',
  nameKey: 'student',
  // Counted by the API over the whole ledger rather than summed over the page
  // on screen, which is the only way these can be right past page one.
  counts: [
    {
      label: 'Outstanding',
      count: async () => (await collectStats()).outstanding_amount,
      format: formatNaira,
    },
    { label: 'Invoices owing', count: async () => (await collectStats()).unpaid_invoices },
    { label: 'Settled', count: async () => (await collectStats()).paid_invoices },
  ],
  // No status column: every row in the queue is owing, so it would say one
  // word all the way down. The registration number earns its place instead —
  // it is what a counter checks a family against.
  columns: [
    { key: 'student', label: 'Pupil', cardRole: 'title' },
    { key: 'regno', label: 'Reg. no.', cardRole: 'subtitle' },
    { key: 'placed', label: 'Class' },
    { key: 'fee', label: 'Fee' },
    { key: 'billed', label: 'Amount', align: 'right' },
  ],
  detail: [
    { key: 'invoice', label: 'Invoice' },
    { key: 'student', label: 'Pupil' },
    { key: 'regno', label: 'Reg. no.' },
    { key: 'placed', label: 'Class' },
    { key: 'fee', label: 'Fee' },
    { key: 'billed', label: 'Amount' },
    { key: 'collected', label: 'Collected' },
    { key: 'status', label: 'Status' },
    { key: 'session', label: 'Session' },
    { key: 'raised', label: 'Raised' },
    { key: 'settledOn', label: 'Settled' },
  ],
  tabs: [paymentsTaken, pupilLedger],
  // The record is not edited from here: an invoice is written by the register
  // and closed by a payment, and there is nothing on it a counter may retype.
  readonly: true,
  source: async ({ page, q }) => {
    const { invoices: items, pagination } = await collectFeesService.outstanding({
      page,
      limit: PAGE_SIZE,
      q,
    })
    return { items: items.map(collectRow), pagination }
  },
  record: (recordId) => collectFeesService.invoice(recordId).then(collectRow),
}

export const invoices: CollectionDef = {
  id: 'invoices',
  path: '/admin/invoices',
  kicker: 'Finance',
  title: 'Invoices',
  description:
    'Every invoice raised against a pupil, settled or not. Open one for the pupil, the fee and when it was paid.',
  action: 'Create invoice',
  searchHint: 'Search invoice or pupil',
  // The endpoint takes no search term — it answers with the whole register
  // whatever is passed — and a box that narrows nothing is worse than none.
  searchable: false,
  footer: 'Newest first',
  emptyTitle: 'No invoices yet',
  emptyBody:
    'Invoices appear here once a fee is raised against a pupil. Create the first one to start billing.',
  noun: 'invoice',
  nameKey: 'student',
  counts: [
    { label: 'Invoices raised', count: countInvoices() },
    { label: 'Still owing', count: countInvoices('Unpaid') },
    { label: 'Settled', count: countInvoices('success') },
  ],
  columns: [
    { key: 'invoice', label: 'Invoice', cardRole: 'subtitle' },
    { key: 'student', label: 'Pupil', cardRole: 'title' },
    { key: 'fee', label: 'Fee' },
    { key: 'billed', label: 'Amount', align: 'right' },
    { key: 'paid', label: 'Paid', align: 'right' },
    { key: 'status', label: 'Status', tag: true, cardRole: 'tag' },
  ],
  detail: INVOICE_DETAIL,
  // With no search box, these are the only way to cut a register of every
  // invoice the school has ever raised down to the ones somebody is chasing.
  // The endpoint spells its date bounds `startdate` and `enddate`, applies
  // each on its own, and answers a range given backwards with nothing at all
  // rather than swapping it — which is why one control writes both.
  filters: [
    { key: 'status', label: 'Any status', options: PAY_STATUS },
    { key: 'startdate', label: 'Any date', until: 'enddate' },
  ],
  rowAction: settleRow,
  source: async ({ page, filters }) => {
    const { items, pagination } = await invoicesService.list({
      page,
      limit: PAGE_SIZE,
      status: filters.status || undefined,
      startdate: filters.startdate || undefined,
      enddate: filters.enddate || undefined,
    })
    return { items: items.map(invoiceRow), pagination }
  },
  record: (recordId) => invoicesService.get(recordId).then(invoiceRow),
  save: async (values, recordId) => {
    if (recordId) return invoicesService.update(recordId, invoiceBody(values))
    // A school with no current session set still raises invoices; the one it
    // is filed under is simply left off. Same reading as the enrolment form.
    const session = await sessionsService.current().catch(() => undefined)
    return invoicesService.create(invoiceBody(values, session?.id))
  },
  /** Refused with 409 once paid, so a settled payment cannot be erased. */
  remove: (recordId) => invoicesService.remove(recordId),
  // The reference and the status are not asked for: the API generates
  // `TSS1/16` itself, and an invoice becomes paid by being settled.
  form: [
    {
      title: 'Invoice',
      fields: [
        {
          key: 'student_id',
          label: 'Pupil',
          required: true,
          wide: true,
          optionsFrom: 'students',
          hint: 'Only pupils already admitted can be billed.',
        },
        { key: 'fee_id', label: 'Fee', required: true, optionsFrom: 'fees' },
        {
          key: 'amount',
          label: 'Amount (₦)',
          required: true,
          money: true,
          placeholder: '30,000',
          hint: 'Defaults to nothing — the fee\'s own amount is not copied here.',
        },
      ],
    },
  ],
}

export const spendings: CollectionDef = {
  id: 'spendings',
  path: '/admin/spendings',
  kicker: 'Finance',
  title: 'Spendings',
  description:
    'The expenditure ledger. Every entry is dated and attributed to the staff member who recorded it, and neither can be typed by hand.',
  action: 'Record a spending',
  searchHint: 'Search description',
  footer: 'Newest first',
  emptyTitle: 'No spendings recorded',
  emptyBody: 'The expenditure ledger is empty. Record the first entry to start it.',
  noun: 'spending',
  nameKey: 'description',
  counts: [
    {
      label: 'Spent this month',
      count: async () => spentIn(await monthlySpend(), monthKey(new Date())).total,
      format: formatNaira,
    },
    {
      label: 'Entries this month',
      count: async () => spentIn(await monthlySpend(), monthKey(new Date())).entries,
    },
    {
      label: 'Spent this year',
      count: async () =>
        spentInYear(await monthlySpend(), String(new Date().getFullYear())),
      format: formatNaira,
    },
  ],
  // The ledger's own date bounds, inclusive at both ends. One control over
  // both, because the endpoint answers a range given backwards with nothing
  // at all rather than swapping it.
  filters: [{ key: 'from', label: 'Any date', until: 'to' }],
  // The endpoint totals whatever the filters match, not just the page, so
  // this is the range's own figure rather than a sum of what is on screen.
  tally: { label: 'Spent in this range', format: formatNaira },
  // No category column: the endpoint holds none, and a column the ledger
  // cannot fill would be blank on every row it has.
  columns: [
    { key: 'date', label: 'Date', cardRole: 'subtitle' },
    { key: 'description', label: 'Description', cardRole: 'title' },
    { key: 'spent', label: 'Amount', align: 'right' },
    { key: 'by', label: 'Recorded by' },
  ],
  detail: [
    { key: 'description', label: 'What it was for' },
    { key: 'spent', label: 'Amount' },
    { key: 'when', label: 'Recorded' },
    { key: 'by', label: 'Recorded by' },
    { key: 'account', label: 'Signed in as' },
  ],
  source: async ({ page, q, filters }) => {
    const { items, pagination, totalAmount } = await spendingsService.list({
      page,
      limit: PAGE_SIZE,
      q,
      from: filters.from || undefined,
      to: filters.to || undefined,
    })
    // Only while a range is set: unfiltered this is the whole ledger, which
    // the three tiles above already answer for and would contradict.
    const dated = Boolean(filters.from || filters.to)
    return { items: items.map(spendingRow), pagination, tally: dated ? totalAmount : undefined }
  },
  record: (recordId) => spendingsService.get(recordId).then(spendingRow),
  save: (values, recordId) =>
    recordId
      ? spendingsService.update(recordId, spendingBody(values))
      : spendingsService.create(spendingBody(values)),
  remove: (recordId) => spendingsService.remove(recordId),
  // The endpoint stamps the date and reads the spender off the token, so the
  // form asks for the two things only the person recording it knows.
  form: [
    {
      title: 'Spending',
      fields: [
        {
          key: 'description',
          label: 'What was it for',
          required: true,
          wide: true,
          placeholder: 'Diesel — 2,000 litres',
          hint: 'Written into the ledger exactly as typed.',
        },
        {
          key: 'amount',
          label: 'Amount (₦)',
          required: true,
          money: true,
          placeholder: '412,000',
          hint: 'Separators are added for you; the figure is spelled out as you type.',
        },
      ],
    },
  ],
}
