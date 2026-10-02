import {
  // FileText,
  BookMarked,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  ClipboardCheck,
  CreditCard,
  LayoutGrid,
  ListChecks,
  SquareCheckBig,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const studentNav: NavGroup[] = [
  {
    items: [
      { to: '/student', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    heading: 'Learning',
    icon: BookOpen,
    items: [
      { to: '/student/courses', label: 'My subjects', icon: BookOpen },
      // { to: '/student/materials', label: 'Subject materials', icon: FileText },
      { to: '/student/library', label: 'My books', icon: BookMarked },
      { to: '/student/timetable', label: 'My timetable', icon: CalendarDays },
      {
        to: '/student/attendance',
        label: 'My attendance',
        icon: CalendarCheck,
      },
    ],
  },
  {
    heading: 'Assessment',
    icon: ClipboardCheck,
    items: [
      {
        to: '/student/assignments',
        label: 'Assignments',
        icon: SquareCheckBig,
      },
      // Split off assignments on 2026-10-02: papers that mark themselves.
      { to: '/student/quizzes', label: 'Quizzes', icon: ListChecks },
      { to: '/student/results', label: 'My results', icon: ChartLine },
      { to: '/student/performance', label: 'My progress', icon: TrendingUp },
    ],
  },
  {
    heading: 'Finance',
    icon: Wallet,
    items: [
      { to: '/student/invoices', label: 'My invoices', icon: CreditCard },
    ],
  },
];
