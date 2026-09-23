import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUrl, paginated, scanPages } from './url.ts'

const BASE = 'https://bronze.uaes.education/api'

test('the base url keeps its path segment', () => {
  assert.equal(buildUrl(BASE, 'users/login'), `${BASE}/users/login`)
  assert.equal(buildUrl(`${BASE}/`, '/users/login'), `${BASE}/users/login`)
})

test('an empty filter is left off rather than sent blank', () => {
  const url = buildUrl(BASE, 'students', {
    q: 'udo',
    status: '',
    department_id: undefined,
    class_arm_id: null,
    page: 1,
  })
  assert.equal(url, `${BASE}/students?q=udo&page=1`)
})

test('zero and false are real filter values, not empties', () => {
  assert.equal(buildUrl(BASE, 'fees', { status: 0, force: false }), `${BASE}/fees?status=0&force=false`)
})

test('a list is narrowed to items and its pagination', () => {
  const result = paginated<{ id: number }>(
    { invoices: [{ id: 1 }], pagination: { page: 2, limit: 50, total: 60, pages: 2 } },
    'invoices',
  )
  assert.deepEqual(result.items, [{ id: 1 }])
  assert.equal(result.pagination.page, 2)
})

test('an unpaged endpoint reads as a single full page', () => {
  const result = paginated<number>({ books: [1, 2, 3] }, 'books')
  assert.deepEqual(result.pagination, { page: 1, limit: 3, total: 3, pages: 1 })
})

test('a missing list is empty rather than undefined', () => {
  assert.deepEqual(paginated({}, 'students').items, [])
})

/** A register of `total` numbered items, served `limit` at a time. */
function register(total: number, limit: number) {
  const asked: number[] = []
  const read = async (page: number) => {
    asked.push(page)
    const from = (page - 1) * limit
    return {
      items: Array.from({ length: Math.max(Math.min(limit, total - from), 0) }, (_, i) => from + i),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }
  }
  return { read, asked }
}

test('a register that fits in one page costs one request', () => {
  const { read, asked } = register(40, 100)
  return scanPages(read, 6).then((scan) => {
    assert.deepEqual(asked, [1])
    assert.equal(scan.items.length, 40)
    assert.equal(scan.total, 40)
  })
})

test('the pages after the first are asked for, and none is skipped', () => {
  // The off-by-one here is the whole bug: page 1 is already read, so the rest
  // start at 2. Starting them at 1 double-counts it and drops the last page.
  const { read, asked } = register(950, 200)
  return scanPages(read, 6).then((scan) => {
    assert.deepEqual(asked, [1, 2, 3, 4, 5])
    assert.deepEqual(scan.items, Array.from({ length: 950 }, (_, i) => i))
    assert.equal(scan.total, 950)
  })
})

test('a server that caps the page size is paged, not truncated', () => {
  // The limit is asked for, not promised. Following the pagination it sends
  // back is what keeps a smaller page from silently becoming a short total.
  const { read } = register(500, 50)
  return scanPages(read, 20).then((scan) => assert.equal(scan.items.length, 500))
})

test('a scan that runs out of requests keeps the register’s own count', () => {
  // What the caller needs in order to say "the newest 600 of 5,000" instead
  // of quietly presenting 600 as the whole thing.
  const { read, asked } = register(5000, 200)
  return scanPages(read, 3).then((scan) => {
    assert.deepEqual(asked, [1, 2, 3])
    assert.equal(scan.items.length, 600)
    assert.equal(scan.total, 5000)
  })
})

test('an empty register asks once and comes back empty', () => {
  const { read, asked } = register(0, 100)
  return scanPages(read, 6).then((scan) => {
    assert.deepEqual(asked, [1])
    assert.deepEqual(scan.items, [])
  })
})
