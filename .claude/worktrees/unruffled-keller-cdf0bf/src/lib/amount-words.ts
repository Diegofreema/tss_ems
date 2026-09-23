import { ToWords } from 'to-words/en-NG'
import { capitalise } from './format.ts'

const WORDS = new ToWords({
  converterOptions: { currency: true, ignoreZeroCurrency: true, doNotAddOnly: true },
})

/**
 * A figure spelled out, so someone typing 412,000 can see at a glance that
 * they did not type 41,200. Blank for nothing typed and for zero — a line
 * reading "zero naira" under an empty field is noise, not a check.
 */
export function amountInWords(value: string | number): string {
  const figure = Number(String(value).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(figure) || figure <= 0) return ''
  // ponytail: past this the converter is spelling out numbers no school
  // charges, and the line would be longer than the field.
  if (figure > Number.MAX_SAFE_INTEGER) return ''
  return capitalise(WORDS.convert(figure).toLowerCase())
}
