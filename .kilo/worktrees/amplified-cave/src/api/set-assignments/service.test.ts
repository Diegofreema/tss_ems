import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { setAssignmentsService } from './service.ts'

/**
 * What each step of setting an assignment actually puts on the wire.
 *
 * Stubbed at `fetch` — the boundary between this portal and the school —
 * rather than at the client below it, so the URL, the method, the body and
 * the unwrapping of the envelope are all under test and only the network is
 * pretended. The keys asserted here are the school's own, which is the point:
 * they are `paper` and `papers` however this portal words it, and a rename
 * that tidies them into `assignment` is a read that comes back empty.
 */

type Call = { url: string; method: string; body: unknown }

let calls: Call[] = []

function answers(data: unknown) {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    })
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }) as typeof fetch
}

const realFetch = globalThis.fetch
beforeEach(() => {
  calls = []
})
afterEach(() => {
  globalThis.fetch = realFetch
})

const BODY = {
  subject_id: 2,
  department_id: 6,
  title: 'Week 5 class test',
  details: '<p>Answer all questions.</p>',
  test_type: 'cbt_test',
  time_limit: 25,
  passing_score: 40,
}

test('setting one posts the body to the assignments endpoint', async () => {
  answers({ paper: { id: 36, title: 'Week 5 class test' } })

  const created = await setAssignmentsService.create(BODY)

  assert.equal(calls.length, 1)
  assert.match(calls[0].url, /\/setassignments$/)
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(calls[0].body, BODY)
  assert.equal(created.paper.id, 36)
})

test('the list is read off the key the school sends it under', async () => {
  answers({
    papers: [{ id: 35, title: 'Mid-term test' }],
    pagination: { page: 1, limit: 50, total: 1, pages: 1 },
  })

  const page = await setAssignmentsService.list({ limit: 200 })

  assert.match(calls[0].url, /\/setassignments\?limit=200$/)
  assert.equal(calls[0].method, 'GET')
  assert.equal(page.items.length, 1)
  assert.equal(page.items[0].title, 'Mid-term test')
  assert.equal(page.pagination.total, 1)
})

test('one assignment comes back under `paper`, with its questions beside it', async () => {
  answers({ paper: { id: 35, title: 'Mid-term test' }, questions: [{ id: 37 }] })

  const answer = await setAssignmentsService.get(35)

  assert.match(calls[0].url, /\/setassignments\/35$/)
  assert.equal(answer.paper.title, 'Mid-term test')
  assert.equal(answer.questions?.length, 1)
})

test('correcting one posts to the assignment itself, status and all', async () => {
  answers({ paper: { id: 36 } })

  await setAssignmentsService.update(36, { ...BODY, status: 'active' })

  assert.match(calls[0].url, /\/setassignments\/36$/)
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(calls[0].body, { ...BODY, status: 'active' })
})

const QUESTION = {
  question_text: 'What is 2 + 2?',
  question_type: 'multiple_choice' as const,
  points: 5,
  options: [{ option_text: '3' }, { option_text: '4', is_correct: true as const }],
}

test('a question is written under the assignment it belongs to', async () => {
  answers({ question: { id: 37 } })

  await setAssignmentsService.addQuestion(36, QUESTION)

  assert.match(calls[0].url, /\/setassignments\/36\/questions$/)
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(calls[0].body, QUESTION)
})

test('correcting a question names the question as well as the assignment', async () => {
  answers({ question: { id: 37 } })

  await setAssignmentsService.updateQuestion(36, 37, { ...QUESTION, points: 8 })

  assert.match(calls[0].url, /\/setassignments\/36\/questions\/37$/)
  assert.equal(calls[0].method, 'POST')
  assert.equal((calls[0].body as { points: number }).points, 8)
})

test('deleting a question sends no body at all', async () => {
  answers({})

  await setAssignmentsService.removeQuestion(36, 37)

  assert.match(calls[0].url, /\/setassignments\/36\/questions\/37$/)
  assert.equal(calls[0].method, 'DELETE')
  assert.equal(calls[0].body, undefined)
})

test('the questions of one assignment carry the total it is worth', async () => {
  answers({ questions: [{ id: 37 }], count: 1, total_marks: 5 })

  const held = await setAssignmentsService.questions(36)

  assert.match(calls[0].url, /\/setassignments\/36\/questions$/)
  assert.equal(held.total_marks, 5)
})

test('the submissions of one assignment come back with the school\'s counters', async () => {
  answers({
    paper: { id: 35, title: 'Assignment 1' },
    submissions: [{ assignment_id: 36, student: 'OBILO AJASINA' }],
    sat: 1,
    marked: 0,
    waiting: 1,
  })

  const held = await setAssignmentsService.submissions(35)

  assert.match(calls[0].url, /\/setassignments\/35\/submissions$/)
  assert.equal(held.submissions[0].assignment_id, 36)
  assert.equal(held.waiting, 1)
})

test('one submission is fetched by its own id, not by the assignment\'s', async () => {
  answers({
    submission: { assignment_id: 36, setassignment_id: 35, student: 'OBILO AJASINA' },
    answers: [{ answer_id: 40, question_id: 37 }],
  })

  const one = await setAssignmentsService.submission(36)

  // Assignment 35's submission is 36, and this route takes the second.
  assert.match(calls[0].url, /\/setassignments\/submissions\/36$/)
  assert.equal(one.submission.setassignment_id, 35)
  assert.equal(one.answers?.[0].answer_id, 40)
})

test('marks are posted against the submission, keyed on each answer', async () => {
  answers({})

  await setAssignmentsService.grade(36, {
    scores: { '40': 1, '41': 1, '42': 0 },
    comment: 'Good work.',
    regrade: true,
  })

  assert.match(calls[0].url, /\/setassignments\/submissions\/36\/grade$/)
  assert.equal(calls[0].method, 'POST')
  assert.deepEqual(calls[0].body, {
    scores: { '40': 1, '41': 1, '42': 0 },
    comment: 'Good work.',
    regrade: true,
  })
})
