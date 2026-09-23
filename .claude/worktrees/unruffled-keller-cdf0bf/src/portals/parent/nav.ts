import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutGrid,
  // MessageSquare goes back in with the Messages group below.
  PenLine,
  SquareCheckBig,
  Users,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const parentNav: NavGroup[] = [
  {
    items: [
      { to: '/parent', label: 'Dashboard', icon: LayoutGrid },
      { to: '/parent/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    heading: 'My children',
    items: [
      { to: '/parent/children', label: 'My children', icon: Users },
      { to: '/parent/results', label: 'Results', icon: SquareCheckBig },
      { to: '/parent/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/parent/timetable', label: 'Timetables', icon: CalendarClock },
    ],
  },
  // {
  //   heading: 'Messages',
  //   items: [
  //     { to: '/parent/msg-school', label: 'Message the school', icon: MessageSquare },
  //   ],
  // },
  {
    heading: 'Assignments',
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
    items: [
      // No badge: the dashboard counts what is owing from the ledger, and a
      // number written in here would be the one believed when they disagreed.
      { to: '/parent/pay', label: 'Pay fees', icon: CreditCard },
      { to: '/parent/invoices', label: 'Invoices', icon: FileText },
    ],
  },
];
