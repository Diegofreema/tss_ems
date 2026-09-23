import type { NoticeAudience, NoticeBody } from '../../../api/notifications/types.ts'

/** The form's values, all strings from the inputs. */
export type FormValues = Record<string, unknown>

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * The notice form as `POST /notifications` wants it.
 *
 * Three of these fields never come back on any read — `department_id`, `link`
 * and `expiresat` — so nothing can confirm they landed. They are sent as the
 * published body describes them: an empty string for a link or an expiry that
 * was left blank, and null for the class when the notice is the whole
 * school's.
 *
 * `recipients` is the one field the endpoint refuses without, so it is never
 * dropped: an unset audience goes out as `all`, which is what a notice with no
 * audience chosen plainly means.
 */
export function noticeBody(values: FormValues): NoticeBody {
  const klass = text(values.department_id)

  return {
    title: text(values.title),
    message: text(values.message),
    recipients: (text(values.recipients) ?? 'all') as NoticeAudience,
    status: text(values.status) ?? 'active',
    // Null rather than dropped: this is what takes a notice off a class and
    // gives it back to the school, and a missing key would leave it where it
    // was on an edit.
    department_id: klass === undefined ? null : Number(klass),
    link: text(values.link) ?? '',
    expiresat: text(values.expiresat) ?? '',
  }
}
