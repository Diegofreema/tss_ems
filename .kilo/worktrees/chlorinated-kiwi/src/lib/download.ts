/**
 * Hands a fetched file to the browser.
 *
 * The endpoints behind these files need the bearer token, so they cannot be
 * reached with a plain link — the file is fetched first and saved from memory
 * here. The anchor goes into the document because Firefox will not follow one
 * that is not in it, and the object URL is released on the next tick rather
 * than immediately, which cancels the save in some browsers.
 */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
