import type { ProfileConfig } from '@/features/profile/types'

export const parentProfile: ProfileConfig = {
  initials: 'EU',
  meta: 'Guardian · 2 children · Chinedu (SS2 B) and Amaka (Primary 5 A)',
  note: 'How the school reaches you about your children. Adding or removing a child is a separate request the office reviews.',
  sessionNote:
    'Signs you out on every other phone and computer. This browser stays signed in.',
  fields: [
    { key: 'fullname', label: 'Full name', required: true },
    { key: 'relationship', label: 'Relationship', locked: true },
    { key: 'email', label: 'Email', required: true, email: true },
    { key: 'phone', label: 'Phone', required: true },
    { key: 'altphone', label: 'Second phone', required: true },
    { key: 'address', label: 'Home address', required: true, wide: true },
  ],
  values: {
    fullname: 'Mr. Emmanuel Udo',
    relationship: 'Father',
    email: 'e.udo@gmail.com',
    phone: '0803 441 2280',
    altphone: '0812 550 7741',
    address: '14 Bode Thomas Street, Surulere, Lagos',
  },
  account: [
    { label: 'Signs in with', value: 'e.udo@gmail.com' },
    { label: 'Last sign-in', value: 'Today, 08:31' },
    { label: 'Password changed', value: '20 Jul 2025' },
    { label: 'Children linked', value: '2' },
  ],
  prefs: [
    { label: 'Email me when an invoice falls due', hint: 'Seven days before, then on the day', on: true },
    { label: 'Email me when a result is published', hint: 'As it happens', on: true },
    { label: 'SMS if a child is marked absent', hint: 'Same morning', on: true },
  ],
}
