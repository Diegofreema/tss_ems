import type { DetailTab } from '@/features/collections/types'

export const staffTabs: DetailTab[] = [
  {
    label: 'Subjects',
    columns: [{ key: 'subject', label: 'Subject' }, { key: 'arm', label: 'Arm' }, { key: 'students', label: 'Students', align: 'right' }],
    rows: [
      { id: 'ss-1', subject: 'Mathematics', arm: 'SS1 A', students: '35' },
      { id: 'ss-2', subject: 'Mathematics', arm: 'SS2 A', students: '36' },
      { id: 'ss-3', subject: 'Further Maths', arm: 'SS2 A', students: '18' },
    ],
  },
  {
    label: 'Uploads',
    columns: [{ key: 'batch', label: 'Batch' }, { key: 'subject', label: 'Subject' }, { key: 'state', label: 'State', tag: true }],
    rows: [
      { id: 'su-1', batch: 'BAT-1142', subject: 'Mathematics', state: 'Approved' },
      { id: 'su-2', batch: 'BAT-1121', subject: 'Further Maths', state: 'Rejected' },
    ],
  },
]

export const parentTabs: DetailTab[] = [
  {
    label: 'Children',
    columns: [{ key: 'name', label: 'Child' }, { key: 'arm', label: 'Arm' }, { key: 'owing', label: 'Owing', align: 'right' }],
    rows: [
      { id: 'pc-1', name: 'Chinedu Udo', arm: 'SS2 B', owing: '₦85,000' },
      { id: 'pc-2', name: 'Amaka Udo', arm: 'Primary 5 A', owing: '₦32,000' },
    ],
  },
  {
    label: 'Payments',
    columns: [{ key: 'receipt', label: 'Receipt' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'date', label: 'Date' }],
    rows: [
      { id: 'pp-1', receipt: 'RCT-8841', amount: '₦120,000', date: '02 Oct 2025' },
      { id: 'pp-2', receipt: 'RCT-8744', amount: '₦15,000', date: '19 Sep 2025' },
    ],
  },
]
