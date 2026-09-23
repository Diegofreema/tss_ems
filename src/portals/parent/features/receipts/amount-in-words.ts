const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety',
]

function underThousand(value: number): string {
  if (value < 20) return ONES[value]
  if (value < 100) {
    const unit = value % 10
    return TENS[Math.floor(value / 10)] + (unit ? `-${ONES[unit]}` : '')
  }
  const rest = value % 100
  return `${ONES[Math.floor(value / 100)]} hundred${rest ? ` and ${underThousand(rest)}` : ''}`
}

function spell(value: number): string {
  if (value < 1000) return underThousand(value)

  if (value < 1_000_000) {
    const rest = value % 1000
    return `${underThousand(Math.floor(value / 1000))} thousand${rest ? ` ${underThousand(rest)}` : ''}`
  }

  const rest = value % 1_000_000
  return `${underThousand(Math.floor(value / 1_000_000))} million${rest ? ` ${spell(rest)}` : ''}`
}

/**
 * The written amount on a receipt, e.g. "One hundred and twenty thousand naira
 * only". Receipts are a financial record, so a wrong figure here is a real
 * problem — the kobo is dropped rather than rounded up.
 */
export function amountInWords(naira: number): string {
  const whole = Math.max(0, Math.floor(naira))
  const spelled = spell(whole)
  return `${spelled.charAt(0).toUpperCase()}${spelled.slice(1)} naira only`
}
