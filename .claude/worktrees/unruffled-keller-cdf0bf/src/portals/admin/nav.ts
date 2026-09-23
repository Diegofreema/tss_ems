import {
  BadgeDollarSign,
  Bell,
  Book,
  BookOpen,
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
  House,
  LayoutGrid,
  List,
  Mail,
  Megaphone,
  Shield,
  SlidersHorizontal,
  SquareCheckBig,
  Table2,
  UserPlus,
  Users,
} from 'lucide-react'
import type { NavGroup } from '@/lib/portal'

export const adminNav: NavGroup[] = [
  {
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutGrid },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    heading: 'Students',
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
    items: [
      { to: '/admin/staff', label: 'Manage staff', icon: Briefcase },
      { to: '/admin/staff-admin', label: 'Administrators', icon: Shield },
      { to: '/admin/staff-teachers', label: 'Teachers', icon: BookOpen },
    ],
  },
  {
    heading: 'Parents',
    items: [
      { to: '/admin/parents', label: 'All parents', icon: House },
      { to: '/admin/parents-invited', label: 'Deactivated', icon: Mail },
    ],
  },
  {
    heading: 'Academics',
    items: [
      { to: '/admin/classes', label: 'Classes & arms', icon: Building2 },
      { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { to: '/admin/calendar', label: 'Sessions & terms', icon: CalendarDays },
      { to: '/admin/timetable', label: 'Timetable', icon: CalendarClock },
      { to: '/admin/results', label: 'Results', icon: ClipboardCheck },
      { to: '/admin/result-queue', label: 'Result approvals', icon: SquareCheckBig },
      { to: '/admin/class-sheet', label: 'Class broadsheet', icon: Table2 },
    ],
  },
  {
    heading: 'School',
    items: [
      { to: '/admin/notices', label: 'Notice board', icon: Megaphone },
      { to: '/admin/library', label: 'Library', icon: Book },
      { to: '/admin/logs', label: 'Activity log', icon: List },
      { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
    ],
  },
  {
    heading: 'Finance',
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
]
