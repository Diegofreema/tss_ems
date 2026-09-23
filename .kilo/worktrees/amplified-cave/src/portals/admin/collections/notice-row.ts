import type { Notice, NoticeAudience } from '../../../api/notifications/types.ts'
import { BLANK } from '../../../features/collections/blank.ts'
import type { Row } from '../../../features/collections/types.ts'
import { when } from '../../../features/collections/when.ts'

/**
 * One notice as the office's register draws it.
 *
 * The board is not a table of paragraphs, so the message is flattened to a
 * line here and read whole on the record page. It is stored as whatever the
 * writer typed — plain text on everything the school holds today, and HTML the
 * moment anyone uses the editor — so it is stripped either way rather than
 * showing tags in a cell.
 */

function text(value: string | null | undefined): string {
  return value?.trim() || BLANK
}

/**
 * Who a notice reaches, in the words an office uses.
 *
 * The API's own keys are what the form submits and what the record stores;
 * these are only ever shown. An audience the school grows later reads as
 * itself rather than disappearing from the column.
 */
export const AUDIENCE_LABELS: Record<string, string> = {
  all: 'Everyone',
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Guardians',
  students_parents: 'Students and guardians',
}

export function audienceLabel(recipients: string | null | undefined): string {
  const key = recipients?.trim()
  if (!key) return BLANK
  return AUDIENCE_LABELS[key] ?? key
}

/** The audiences the server will accept, as the form offers them. */
export function audienceOptions(audiences: string[]) {
  return audiences.map((value) => ({ value, label: audienceLabel(value) }))
}

/** How far a notice reaches — the class where it names one, else the school. */
export function reachOf(notice: Notice): string {
  if (notice.scope !== 'class') return 'Whole school'
  return notice.class_name?.trim() || 'One class'
}

export function noticeRow(notice: Notice): Row {
  return {
    id: String(notice.id),
    title: text(notice.title),
    audience: audienceLabel(notice.recipients),
    reach: reachOf(notice),
    posted: when(notice.datecreated),
    views: String(notice.viewcount ?? 0),
    status: text(notice.status),

    /*
     * Read by the record panel and the edit form rather than the table, and
     * kept **as the office wrote it**. Stripping the markup here cost the
     * formatting twice over: the panel drew a notice's headings and lists as
     * one flat paragraph, and the edit form loaded the flattened copy into the
     * editor — so opening a notice and saving it destroyed the formatting for
     * good. The register never shows this field, and the search box already
     * matches on `plainText`, so there is nothing left that wanted it stripped.
     */
    message: notice.message ?? '',
    postedBy: text(notice.posted_by),
    raised: notice.is_automatic ? 'Automatically, by an assignment being set' : 'By hand',
    // What the form submits, kept beside the words the table shows.
    recipients: (notice.recipients ?? '') as NoticeAudience,
  }
}
