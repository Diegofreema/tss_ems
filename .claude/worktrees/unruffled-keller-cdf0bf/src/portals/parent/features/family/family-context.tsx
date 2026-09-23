import type { Parent } from '@/api/parents/types'
import { Tag } from '@/components/common/tag'
import { formatNaira } from '@/lib/format'
import { useSessionStore } from '@/stores/session.store'
import { familyOwing } from '../../family'
import { useLoadedFamily, useParentId } from '../../parent.store'

/**
 * The household block above the parent's sidebar: whose record this is, how
 * many children are on it, and what is still owed across them.
 *
 * Read live rather than written down — the figure has to agree with the
 * dashboard tile beside it, and a written-in one would be the one believed.
 */
export function FamilyContext() {
  const account = useSessionStore((state) => state.account)
  const parentId = useParentId()
  const family = useLoadedFamily()

  if (parentId === null) return null

  const record = account?.profile as Parent | undefined
  const name =
    record?.fathersname?.trim() || record?.mothersname?.trim() || 'Your household'
  const phone = record?.fatherphone?.trim() || record?.motherphone?.trim()
  const owed = familyOwing(family)

  return (
    <div className="border-b-2 border-divider px-4 pt-3.5 pb-3">
      <div className="font-heading text-sm font-extrabold">{name}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">
        {[phone, `${family.length} ${family.length === 1 ? 'child' : 'children'}`]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {owed > 0 && (
        <Tag variant="accent" className="mt-2">
          {formatNaira(owed)} owing
        </Tag>
      )}
    </div>
  )
}
