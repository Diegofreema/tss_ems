import type { Admin } from '../../api/users/types.ts';
import { BLANK } from '../../features/collections/blank.ts';
import { asDate, initialsOf, text } from '../../features/profile/record.ts';
import type { ProfileConfig } from '../../features/profile/types.ts';

/**
 * The office record, as its owner reads it.
 *
 * Built from `GET /admins/profile`, which is the same record `PATCH
 * /users/profile` writes back to — so the boxes are prefilled from the thing
 * the Save button edits. The login is a separate row with a separate name and
 * a separate phone, and prefilling from that one would have quietly copied it
 * over the office record on the first save.
 */

const NOTE =
  'Your office record, which is what the school holds about you. Your sign-in name and what you can open are set elsewhere and are shown here to read.';

const SESSION_NOTE =
  'Signs you out everywhere except this browser. Useful if you have used a shared computer in the office.';

const FIELDS: ProfileConfig['fields'] = [
  { key: 'fullname', label: 'Full name', required: true },
  { key: 'job', label: 'Job', placeholder: 'Bursar' },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'address', label: 'Address', wide: true },
  { key: 'gender', label: 'Gender', locked: true },
  { key: 'role', label: 'Account', locked: true },
  { key: 'klass', label: 'Class', locked: true },
  { key: 'privileges', label: 'What you can open', locked: true, wide: true },
];

/** The prototype's page, for the moment before the record answers. */
const EMPTY: ProfileConfig = {
  initials: '··',
  meta: '',
  note: NOTE,
  sessionNote: SESSION_NOTE,
  fields: FIELDS,
  values: {
    fullname: '',
    job: '',
    phone: '',
    address: '',
    gender: BLANK,
    role: BLANK,
    klass: BLANK,
    privileges: BLANK,
  },
  // Left for the session to fill in: this shape is only reached when the
  // record did not answer, and the login is the one thing still known.
  account: [{ label: 'Signs in with', value: BLANK }],
  prefs: [
    {
      label: 'Email me about overdue fees',
      hint: 'A daily digest at 16:00',
      on: true,
    },
    {
      label: 'Email me when a result batch needs approval',
      hint: 'As it happens',
      on: true,
    },
    {
      label: 'SMS for anything marked urgent',
      hint: 'Charged to the school line',
      on: false,
    },
  ],
};

export function adminProfile(admin?: Admin): ProfileConfig {
  if (!admin) return EMPTY;

  const names = [admin.surname, admin.lastname].filter(Boolean);
  const held = admin.privileges ?? [];
  // The job the office writes on the record — "Registrar", "ICT Director" —
  // not the account's role, which is what the portal lets them open.
  const job = admin.profile?.trim() ?? '';
  const role = admin.user?.role?.role_name;

  return {
    ...EMPTY,
    initials: initialsOf(names),
    meta: [role, admin.department?.name, job].filter(Boolean).join(' · '),
    values: {
      // The endpoint takes the two halves separately and the record puts the
      // surname first, so that is the order this is read back apart in.
      fullname: names.join(' '),
      job,
      phone: admin.phone ?? '',
      address: admin.address ?? '',
      gender: text(admin.gender),
      role: text(role),
      klass: text(admin.department?.name),
      privileges: held.length
        ? held.map((privilege) => privilege.name).join(', ')
        : 'Nothing yet — ask another administrator to grant you a section.',
    },
    account: [
      { label: 'Signs in with', value: text(admin.user?.username) },
      { label: 'Account', value: text(role) },
      // Whether the login works at all, which is a different thing from the
      // office record's own always-"active" status.
      { label: 'Sign-in', value: text(admin.user?.userstatus) },
      { label: 'On record since', value: asDate(admin.date_created) },
    ],
    // Already the person's own record: the session has nothing to add to it.
    fromRecord: true,
  };
}
