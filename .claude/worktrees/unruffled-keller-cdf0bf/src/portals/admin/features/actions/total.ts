import type { PickerItem } from './types.ts'

/**
 * What allocating a fee to the picked arms will actually bill. Money the
 * bursary is about to raise against real families, so it counts the pupils in
 * every picked arm rather than the arms themselves.
 */
export function billing(
  items: PickerItem[],
  picked: string[],
  unitAmount: number,
) {
  const pupils = items
    .filter((item) => picked.includes(item.key))
    .reduce((sum, item) => sum + item.count, 0)
  return { pupils, amount: pupils * unitAmount }
}
