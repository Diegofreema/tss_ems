import {
  BadgeDollarSign,
  Book,
  BookOpen,
  BookUp,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  ChartLine,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  House,
  LayoutGrid,
  List,
  Megaphone,
  MessagesSquare,
  Shield,
  SquareCheckBig,
  Table2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import type { NavGroup } from '@/lib/portal';

export const adminNav: NavGroup[] = [
  {
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutGrid },
    ],
  },
  {
    heading: 'Students',
    icon: GraduationCap,
    items: [
      { to: '/admin/students', label: 'Enrolled', icon: Users },
      // No badge, for the reason above: the dashboard counts applicants from
      // the API, and a written-in number beside it would be the one believed.
      { to: '/admin/applicants', label: 'Applicants', icon: UserPlus },
      { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/admin/att-report', label: 'Attendance report', icon: FileText },
    ],
  },
  {
    heading: 'Staff',
    icon: Briefcase,
    items: [
      { to: '/admin/staff', label: 'Manage staff', icon: Briefcase },
      { to: '/admin/staff-admin', label: 'Administrators', icon: Shield },
      { to: '/admin/staff-teachers', label: 'Teachers', icon: BookOpen },
    ],
  },
  {
    heading: 'Parents',
    icon: Users,
    items: [{ to: '/admin/parents', label: 'All parents', icon: House }],
  },
  {
    heading: 'Academics',
    icon: BookOpen,
    items: [
      { to: '/admin/classes', label: 'Classes & arms', icon: Building2 },
      { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/admin/calendar', label: 'Sessions & terms', icon: CalendarDays },
      { to: '/admin/timetable', label: 'Timetable', icon: CalendarClock },
      { to: '/admin/results', label: 'Results', icon: ClipboardCheck },
      {
        to: '/admin/result-queue',
        label: 'Result approvals',
        icon: SquareCheckBig,
      },
      { to: '/admin/class-sheet', label: 'Class broadsheet', icon: Table2 },
      { to: '/admin/performance', label: 'Performance', icon: TrendingUp },
    ],
  },
  {
    heading: 'School',
    icon: Building2,
    items: [
      { to: '/admin/notices', label: 'Notice board', icon: Megaphone },
      // No badge: the count is live and this list is a module constant. The
      // header's messages button carries the unread figure instead.
      { to: '/admin/messages', label: 'Messages', icon: MessagesSquare },
      { to: '/admin/library', label: 'Library', icon: Book },
      { to: '/admin/lending', label: 'Lending', icon: BookUp },
      { to: '/admin/logs', label: 'Activity log', icon: List },
      // Settings is not repeated here: the rail's Tools section carries it,
      // which is where somebody looks for their own settings.
    ],
  },
  {
    heading: 'Finance',
    icon: Wallet,
    items: [
      { to: '/admin/fees', label: 'Fee catalogue', icon: BadgeDollarSign },
      // No badge: the queue counts itself on the page, and a number here that
      // disagreed with the one on screen would be the one people believed.
      { to: '/admin/collect', label: 'Fee collection', icon: CreditCard },
      { to: '/admin/invoices', label: 'Invoices', icon: FileText },
      { to: '/admin/spendings', label: 'Spendings', icon: ChartLine },
      { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
    ],
  },
];
