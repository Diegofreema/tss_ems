import type { StudentContent, TopicPost } from '../../../../api/my-schooling/types.ts'
import { fromDisplayStamp, when } from '../../../../features/collections/when.ts'
import type { Row } from '../../../../features/collections/types.ts'

/**
 * The scheme of work a child reads, off `GET /students/me/content`.
 *
 * The teacher's side of this is the same rows filtered by who wrote them; here
 * they are filtered by the subject being opened. Both filter on the device
 * rather than at the endpoint — this one takes a `subject_id` and is not sent
 * one, because the whole answer is small and a set held whole opens in a
 * classroom with no signal.
 */

/** Newest first: a scheme is read at the end a teacher has just added to. */
function newestFirst(topics: TopicPost[]): TopicPost[] {
  return [...topics].sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0))
}

/**
 * When it went up, in the school's own words.
 *
 * `posted` arrives already formatted, and formatted for **America** —
 * "9/16/26, 8:21 AM". Handing that to `Date.parse` is the mistake that blanked
 * an assignment's opening date, so it goes through `fromDisplayStamp`, and
 * anything that shape cannot read is shown exactly as the school sent it
 * rather than as a dash: a date a student can read is better than nothing,
 * even in the wrong dialect.
 */
export function postedOn(topic: TopicPost): string {
  const raw = topic.posted?.trim()
  if (!raw) return ''
  const stamp = fromDisplayStamp(raw)
  return stamp ? when(stamp, true) : raw
}

/** The line under a topic's heading: who wrote it, and when. */
export function topicMeta(topic: TopicPost): string {
  return [topic.teacher?.trim(), postedOn(topic)].filter(Boolean).join(' · ')
}

/**
 * One subject's topics, as the accordion reads them.
 *
 * The subject is matched as a string because that is what a record id is
 * everywhere in this layer, and a number compared against it is silently
 * never equal.
 */
export function topicRows(
  content: StudentContent | undefined,
  subjectId: string,
): Row[] {
  const wanted = String(subjectId ?? '').trim()
  const mine = (content?.topics ?? []).filter(
    (topic) => String(topic.subject_id ?? '') === wanted,
  )
  return newestFirst(mine).map((topic) => ({
    id: String(topic.id),
    title: topic.title?.trim() || 'Untitled topic',
    contents: topic.contents ?? '',
    meta: topicMeta(topic),
    teacher: topic.teacher?.trim() ?? '',
  }))
}
