import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  CreditCard,
  FileText,
  LayoutGrid,
  SquareCheckBig,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const studentNav: NavGroup[] = [
  {
    items: [
      { to: '/student', label: 'Dashboard', icon: LayoutGrid },
      { to: '/student/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    heading: 'Learning',
    items: [
      { to: '/student/courses', label: 'My subjects', icon: BookOpen },
      { to: '/student/materials', label: 'Subject materials', icon: FileText },
      { to: '/student/timetable', label: 'My timetable', icon: CalendarDays },
      { to: '/student/attendance', label: 'My attendance', icon: CalendarCheck },
    ],
  },
  {
    heading: 'Assessment',
    items: [
      { to: '/student/assignments', label: 'Assignments', icon: SquareCheckBig },
      { to: '/student/results', label: 'My results', icon: ChartLine },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { to: '/student/invoices', label: 'My invoices', icon: CreditCard },
    ],
  },
];
