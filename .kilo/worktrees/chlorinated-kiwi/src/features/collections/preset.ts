/**
 * What a create form arrives already knowing.
 *
 * A record written from beside another one has part of itself decided by
 * where it was opened from — a topic added from a subject's page is a topic
 * in that subject — and the decision travels in the URL rather than being
 * asked again on the form.
 *
 * Loose rather than a named list of keys: a preset belongs to the form it
 * seeds, and naming every key here would mean the create route knowing the
 * fields of every collection its portal holds. The form reads only the keys
 * it actually has, so anything else in the URL is ignored rather than carried
 * into the body.
 */
export function presetSearch(search: Record<string, unknown>): Record<string, string> {
  const kept: Record<string, string> = {}
  for (const [key, value] of Object.entries(search)) {
    // A hand-typed `?subject_id=4` arrives as the number 4 — the router parses
    // search values as JSON — and names the same subject the quoted string does.
    if (typeof value === 'string') kept[key] = value
    else if (typeof value === 'number') kept[key] = String(value)
  }
  return kept
}
