import {
  CalendarCheck,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutGrid,
  MessageSquare,
  NotebookPen,
  PenLine,
  SquareCheckBig,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const parentNav: NavGroup[] = [
  {
    items: [
      { to: '/parent', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    heading: 'My children',
    icon: Users,
    items: [
      { to: '/parent/children', label: 'My children', icon: Users },
      { to: '/parent/results', label: 'Results', icon: SquareCheckBig },
      { to: '/parent/performance', label: 'Progress', icon: TrendingUp },
      { to: '/parent/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/parent/timetable', label: 'Timetables', icon: CalendarClock },
    ],
  },
  {
    heading: 'Messages',
    icon: MessageSquare,
    items: [
      // No badge: the count is live and this list is a module constant, so a
      // number written in here would be the one believed when it went stale.
      // The header's messages button carries the unread figure instead.
      { to: '/parent/messages', label: 'Messages', icon: MessageSquare },
    ],
  },
  {
    heading: 'Assignments',
    icon: NotebookPen,
    items: [
      {
        to: '/parent/assignments',
        label: 'Assignments for my children',
        icon: PenLine,
      },
    ],
  },
  {
    heading: 'Finance',
    icon: Wallet,
    items: [
      // No badge: the dashboard counts what is owing from the ledger, and a
      // number written in here would be the one believed when they disagreed.
      { to: '/parent/pay', label: 'Pay fees', icon: CreditCard },
      { to: '/parent/invoices', label: 'Invoices', icon: FileText },
    ],
  },
];
