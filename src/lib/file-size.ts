/**
 * The largest document a person may attach to a record: a passport
 * photograph, a birth certificate, a medical record. One megabyte, the
 * binary one — what the school's own upload rule means by "1 MB".
 *
 * Checked on the device as the file lands, not left to the school: a 6 MB
 * phone photo over the connection this app lives on is a minute of upload
 * that ends in a refusal, and the form it was attached to could not be saved
 * offline in the meantime either.
 */
export const DOCUMENT_MAX_BYTES = 1024 * 1024

/** A file size a person reads, rather than a number of bytes. */
export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const megabytes = bytes / (1024 * 1024)
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`
}

/** What a file over the limit is told, in the limit's own words. */
export function tooLargeMessage(bytes: number, limit: number): string {
  return `That file is ${readableSize(bytes)} — the most this takes is ${readableSize(limit)}.`
}
