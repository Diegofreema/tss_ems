import { formatNaira, parseNaira } from '../../../../lib/format.ts'
import { familyOwing, SCHOOL_WEEK, type Child } from '../../family.ts'

/** "1 invoice", "3 invoices" — a delta line is prose, not a column. */
function counted(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`
}

/** A figure written as money, counting up on mount. */
function moneyTile(label: string, amount: number, delta: string, hot = false) {
  return { label, amount, format: 'naira' as const, delta, hot }
}

/**
 * The four figures over the parent's dashboard.
 *
 * Neither an average nor an attendance rate is among them, and both were on
 * the design: no result has been approved for any pupil on this school, so an
 * average would be a figure invented from nothing, and a rate needs a register
 * to be a share of. What the register does say — days present out of days
 * marked — is here instead, and reads honestly on a child nobody has marked.
 */
export function figuresFor(child: Child, family: Child[]) {
  const owing = family.filter((one) => one.owing > 0).length
  const settled = child.invoices.filter((invoice) => invoice.state === 'Paid').length

  return [
    moneyTile(
      `Owing for ${child.name}`,
      child.owing,
      child.owing > 0
        ? counted(child.invoices.length - settled, 'invoice', 'invoices') + ' unpaid'
        : 'Nothing outstanding',
      child.owing > 0,
    ),
    moneyTile(
      'Family total owing',
      familyOwing(family),
      counted(owing, 'child owes', 'children owe'),
      owing > 0,
    ),
    moneyTile(
      `Paid for ${child.name}`,
      child.paid,
      counted(settled, 'invoice', 'invoices') + ' settled',
    ),
    {
      label: 'Days present',
      amount: child.present,
      format: 'number' as const,
      delta: child.marked
        ? `of ${counted(child.marked, 'day', 'days')} marked`
        : 'No register taken yet',
      hot: child.marked > 0 && child.present < child.marked,
    },
  ]
}

/**
 * Attendance week by week.
 *
 * A week is drawn against the days actually marked in it rather than against
 * five, because a register is not taken every day here — and a week nobody
 * marked is left plain rather than flagged, since missing marks are the
 * school's business and not the parent's.
 */
export function attendanceBarsFor(child: Child) {
  return {
    bars: child.weeks.map((week) => ({
      label: week.label,
      value: week.present,
      display: week.marked ? `${week.present}/${week.marked}` : '—',
      highlight: week.marked > 0 && week.present < week.marked,
    })),
    peak: Math.max(SCHOOL_WEEK, ...child.weeks.map((week) => week.marked)),
  }
}

/** How many bills the panel lists before handing over to the register. */
export const QUEUE_SHOWN = 6

/**
 * What needs the parent, which on this API is every invoice still owing — the
 * one thing a guardian can act on from here. Largest first: a household paying
 * off what it can clears the biggest bill first.
 *
 * A household years behind can be owing a dozen bills, and a dozen rows is a
 * page rather than a summary — so the rest are counted into a last line that
 * says how many were left out and opens the register that holds them all.
 *
 * Everything else the design listed — an open assignment, an unexplained
 * absence, a result newly published — needs an endpoint that answers for this parent's
 * own children, and none of them can be reached yet.
 */
export function queueFor(family: Child[], shown = QUEUE_SHOWN) {
  const owing = family
    .flatMap((child) =>
      child.invoices
        .filter((invoice) => invoice.state === 'Owing')
        .map((invoice) => ({
          id: `${child.id}-${invoice.id}`,
          balance: parseNaira(invoice.balance),
          title: `${invoice.balance} outstanding for ${child.name}`,
          detail: `${invoice.fee} · ${invoice.invoice} · ${invoice.session}`,
          cta: 'Pay',
          to: '/parent/pay' as const,
          urgent: true,
        })),
    )
    .sort((a, b) => b.balance - a.balance)

  if (owing.length <= shown) return { items: owing, total: owing.length }

  const rest = owing.slice(shown)
  return {
    items: [
      ...owing.slice(0, shown),
      {
        id: 'rest',
        balance: 0,
        title: counted(rest.length, 'older bill', 'older bills') + ' not listed here',
        detail: formatNaira(rest.reduce((sum, one) => sum + one.balance, 0)) + ' between them',
        cta: 'See all',
        to: '/parent/invoices' as const,
        urgent: false,
      },
    ],
    total: owing.length,
  }
}
