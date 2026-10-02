import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { Account } from '../../api/auth/types.ts'
import {
  type Access,
  accessOf,
  ANY_OF_PAGES,
  closedBecause,
  holds,
  mayOpen,
  NO_ACCESS,
  OPEN_PAGES,
  PAGE_SECTIONS,
  pageOf,
  sectionOf,
  sectionsOf,
  visibleNav,
} from './privileges.ts'

/** The catalogue exactly as the live `GET /admins/1/privileges` sent it, 2026-10-02. */
const AVAILABLE = [
  { id: 1, name: 'Admission' },
  { id: 2, name: 'Student' },
  { id: 3, name: 'Result' },
  { id: 4, name: 'Report' },
  { id: 5, name: 'Transcript' },
  { id: 6, name: 'Setting' },
  { id: 7, name: 'Admin' },
  { id: 8, name: 'News and Events' },
  { id: 9, name: 'Library' },
  { id: 10, name: 'Hostels' },
  { id: 11, name: 'Manage Emails' },
  { id: 12, name: 'Fees and Payments' },
  { id: 13, name: 'Library' },
  { id: 14, name: 'Attendance' },
  { id: 15, name: 'Timetable' },
  { id: 16, name: 'Parent Messaging' },
  { id: 17, name: 'Assignments and Tests' },
  { id: 18, name: 'Subjects and Classes' },
]

/** The first holding by id, where two entries share a name. */
const byId = (...ids: number[]): Access => ({
  everything: false,
  held: sectionsOf(AVAILABLE.filter((one) => ids.includes(one.id))),
})

const holding = (...names: string[]): Access => ({
  everything: false,
  held: sectionsOf(AVAILABLE.filter((one) => names.includes(one.name))),
})

describe('sectionOf', () => {
  it('reads every privilege the school sends', () => {
    assert.deepEqual(
      AVAILABLE.map(sectionOf),
      [
        'admission', 'student', 'result', 'report', 'transcript', 'setting', 'admin', 'news',
        'library', 'hostels', 'emails', 'fees', 'library', 'attendance', 'timetable',
        'parentMessaging', 'assignments', 'classes',
      ],
    )
  })

  it('takes HRM and its new name Library as the same grant', () => {
    assert.equal(sectionOf({ id: 9, name: 'HRM' }), 'library')
    assert.equal(sectionOf({ id: 9, name: 'Library' }), 'library')
  })

  it('ignores case and spacing in the name', () => {
    assert.equal(sectionOf({ id: 99, name: '  news  AND events ' }), 'news')
  })

  it('falls back to the id for a name it has never seen', () => {
    assert.equal(sectionOf({ id: 4, name: 'Reports and accounts' }), 'report')
  })

  it('believes a known name over the id', () => {
    assert.equal(sectionOf({ id: 4, name: 'Library' }), 'library')
  })

  it('grants nothing for a privilege it cannot place', () => {
    assert.equal(sectionOf({ id: 40, name: 'Canteen' }), null)
  })
})

describe('mayOpen', () => {
  it('opens the shared pages to an account holding nothing', () => {
    const none = holding()
    for (const path of ['/admin', '/admin/', '/admin/notifications', '/admin/profile', '/admin/closed']) {
      assert.equal(mayOpen(none, path), true, path)
    }
  })

  it('closes a register, its records and its flows together', () => {
    const none = holding()
    for (const path of ['/admin/students', '/admin/students/12', '/admin/students/new', '/admin/students/12/edit', '/admin/students/action']) {
      assert.equal(mayOpen(none, path), false, path)
    }
    const student = holding('Student')
    assert.equal(mayOpen(student, '/admin/students/12/edit'), true)
  })

  it('puts the money pages under Fees and Payments', () => {
    const fees = holding('Fees and Payments')
    for (const path of ['/admin/fees', '/admin/collect', '/admin/collect/receipt/4', '/admin/collect/report', '/admin/invoices', '/admin/spendings']) {
      assert.equal(mayOpen(fees, path), true, path)
      assert.equal(mayOpen(holding('Report'), path), false, path)
    }
  })

  it('keeps the school-wide analytics under Report', () => {
    assert.equal(mayOpen(holding('Report'), '/admin/analytics'), true)
    assert.equal(mayOpen(holding('Fees and Payments'), '/admin/analytics'), false)
  })

  it('gives each newer section its own pages', () => {
    assert.equal(mayOpen(holding('Attendance'), '/admin/attendance'), true)
    assert.equal(mayOpen(holding('Attendance'), '/admin/att-report'), true)
    assert.equal(mayOpen(holding('Student'), '/admin/attendance'), false)
    assert.equal(mayOpen(holding('Timetable'), '/admin/timetable'), true)
    assert.equal(mayOpen(holding('Setting'), '/admin/timetable'), false)
    for (const path of ['/admin/classes', '/admin/arms', '/admin/subjects/4']) {
      assert.equal(mayOpen(holding('Subjects and Classes'), path), true, path)
      assert.equal(mayOpen(holding('Setting'), path), false, path)
    }
    for (const path of ['/admin/settings', '/admin/calendar', '/admin/terms']) {
      assert.equal(mayOpen(holding('Setting'), path), true, path)
    }
  })

  it('opens the library to either Library entry, and to HRM, its old name', () => {
    for (const library of [byId(9), byId(13), { everything: false, held: sectionsOf([{ id: 9, name: 'HRM' }]) }]) {
      assert.equal(mayOpen(library, '/admin/library'), true)
      assert.equal(mayOpen(library, '/admin/lending'), true)
      assert.equal(mayOpen(library, '/admin/books/3'), true)
      assert.equal(mayOpen(library, '/admin/staff'), false)
    }
  })

  it('puts the staff registers under Admin', () => {
    const admin = holding('Admin')
    for (const path of ['/admin/staff', '/admin/staff-admin', '/admin/staff-teachers', '/admin/staff-other', '/admin/logs']) {
      assert.equal(mayOpen(admin, path), true, path)
    }
  })

  it('opens everything to a super administrator', () => {
    const superAdmin: Access = { everything: true, held: new Set() }
    assert.equal(mayOpen(superAdmin, '/admin/invoices'), true)
    assert.equal(holds(superAdmin, 'hostels'), true)
  })

  it('closes every gated page while nothing has been read', () => {
    assert.equal(mayOpen(NO_ACCESS, '/admin/students'), false)
    assert.equal(mayOpen(NO_ACCESS, '/admin'), true)
  })
})

describe('the search box', () => {
  it('opens with either register it looks through', () => {
    assert.equal(mayOpen(holding('Student'), '/admin/search'), true)
    assert.equal(mayOpen(holding('Admin'), '/admin/search'), true)
    assert.equal(mayOpen(holding('Report', 'Setting'), '/admin/search'), false)
  })

  it('says which privileges would open it', () => {
    assert.match(closedBecause('/admin/search'), /the Student or the Admin privilege/)
    assert.match(closedBecause('/admin/invoices/3'), /the Fees and Payments privilege/)
  })
})

describe('pageOf', () => {
  it('reads the first segment under the base', () => {
    assert.equal(pageOf('/admin'), '')
    assert.equal(pageOf('/admin/'), '')
    assert.equal(pageOf('/admin/collect/receipt/4'), 'collect')
    assert.equal(pageOf('/admin/students?q=okafor&page=2'), 'students')
    assert.equal(pageOf('/admin?tab=1'), '')
    assert.equal(pageOf('/admin/fees#top'), 'fees')
  })
})

describe('the map covers the portal', () => {
  /** The page segment a route file mounts at, or null for a generic one. */
  const segmentOf = (file: string): string | null => {
    const name = file.replace(/\.tsx$/, '')
    if (name === 'route' || name.startsWith('$')) return null
    if (name === 'index') return ''
    return name.split('.')[0]
  }

  it('names every route file under src/routes/admin', () => {
    const files = readdirSync(new URL('../../routes/admin/', import.meta.url))
    const open = new Set<string>(OPEN_PAGES)
    const missing = files
      .map(segmentOf)
      .filter((segment): segment is string => segment !== null)
      .filter(
        (segment) =>
          !open.has(segment) && !(segment in PAGE_SECTIONS) && !(segment in ANY_OF_PAGES),
      )
    assert.deepEqual(missing, [])
  })

  it('names every collection the record routes can open', () => {
    // Read off the source: the registry imports the definitions, which this
    // runner cannot load, and its keys are all that is wanted here.
    const source = readFileSync(
      new URL('../../portals/admin/collections/index.ts', import.meta.url),
      'utf8',
    )
    const body = source.slice(source.indexOf('adminCollections = {'), source.indexOf('} satisfies'))
    const adminCollectionIds = [...body.matchAll(/^\s+'?([a-z-]+)'?[:,]/gm)].map((match) => match[1])
    assert.ok(adminCollectionIds.length > 20, 'the registry was read')
    const missing = adminCollectionIds.filter((id) => !(id in PAGE_SECTIONS))
    assert.deepEqual(missing, [])
  })
})

describe('visibleNav', () => {
  it('drops the pages that cannot be opened and the groups left empty', () => {
    const nav = [
      { items: [{ to: '/admin' }] },
      { heading: 'Finance', items: [{ to: '/admin/fees' }, { to: '/admin/invoices' }] },
      { heading: 'Students', items: [{ to: '/admin/students' }, { to: '/admin/applicants' }] },
    ]
    const may = (path: string) => mayOpen(holding('Admission'), path)
    assert.deepEqual(visibleNav(nav, may), [
      { items: [{ to: '/admin' }] },
      { heading: 'Students', items: [{ to: '/admin/applicants' }] },
    ])
  })
})

describe('accessOf', () => {
  const office = (privileges?: { id: number; name: string }[], role = { id: 1, role_name: 'Admin' }) =>
    ({
      user: { id: 1 },
      role,
      profile_type: 'admin',
      profile: { id: 1, privileges },
    }) as unknown as Account

  it('opens everything to a super administrator, whatever they hold', () => {
    const access = accessOf(office([], { id: 5, role_name: 'Super Admin' }), [])
    assert.equal(access.everything, true)
  })

  it('believes the privileges endpoint over the copy on the record', () => {
    const access = accessOf(office([{ id: 2, name: 'Student' }]), [{ id: 3, name: 'Result' }])
    assert.deepEqual([...(access.held ?? [])], ['result'])
  })

  it('falls back to the record where the endpoint has never answered', () => {
    const access = accessOf(office([{ id: 2, name: 'Student' }]), null)
    assert.deepEqual([...(access.held ?? [])], ['student'])
  })

  it('knows nothing where neither has said anything', () => {
    assert.equal(accessOf(office(undefined), null).held, null)
    assert.equal(accessOf(null, null).held, null)
  })

  it('reads an empty grant as holding nothing, not as unknown', () => {
    assert.deepEqual([...(accessOf(office(undefined), []).held ?? ['x'])], [])
  })
})
