import assert from 'node:assert/strict'
import test from 'node:test'
import { readEnvelope } from './envelope.ts'

/** The head of what `POST /students` sent on 2026-09-24, cut down from 58 KB. */
const CAKE_WARNING = `<div class="cake-error">
    <a href="javascript:void(0);"
  onclick="document.getElementById('cakeErr6ab5-trace').style.display = (document.getElementById('cakeErr6ab5-trace').style.display == 'none' ? '' : 'none')"
>
    <b>Deprecated</b> (16384)
</a>: allowEmpty() is deprecated. Use allowEmptyString() instead.
/home/tsssch/portal.tss.sch.ng/backend/src/Model/Table/StudentsTable.php, line: 180
<pre class="cake-trace">deprecationWarning … line 328</pre>
</div>`

const SAVED = '{"success":true,"message":"The student has been saved.","data":{"student":{"id":232,"fname":"Claudetest"}}}'

test('a plain answer is read as it is', () => {
  assert.deepEqual(readEnvelope(SAVED), JSON.parse(SAVED))
  assert.deepEqual(readEnvelope('{"success":false,"message":"no","errors":{"email":{"_isUnique":"taken"}}}'), {
    success: false,
    message: 'no',
    errors: { email: { _isUnique: 'taken' } },
  })
})

test('an answer behind a PHP warning is still the school saying yes', () => {
  assert.deepEqual(readEnvelope(CAKE_WARNING + SAVED), JSON.parse(SAVED))
  assert.deepEqual(readEnvelope(CAKE_WARNING + CAKE_WARNING + '\n' + SAVED + '\n'), JSON.parse(SAVED))
})

test('an envelope-looking fragment inside the warning is not taken for the answer', () => {
  const decoy = `<pre>{"success":false,"message":"from a log line"}</pre>`
  assert.deepEqual(readEnvelope(decoy + SAVED), JSON.parse(SAVED))
})

test('a body with no envelope in it is nothing, not a guess', () => {
  assert.equal(readEnvelope(''), null)
  assert.equal(readEnvelope(CAKE_WARNING), null)
  assert.equal(readEnvelope('<html>502 Bad Gateway</html>'), null)
  assert.equal(readEnvelope('{"data":[]}'), null)
})

test('a spaced-out encoder is still found', () => {
  assert.deepEqual(readEnvelope(CAKE_WARNING + '{ "success" : true, "data": 1 }'), { success: true, data: 1 })
})
