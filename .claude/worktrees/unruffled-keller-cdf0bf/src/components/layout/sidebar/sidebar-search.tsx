import { Input } from '@/components/ui/input'
import { useShellStore } from '@/stores/shell.store'

/** Filters the sidebar nav. Only the Admin portal carries one. */
export function SidebarSearch() {
  const navQuery = useShellStore((state) => state.navQuery)
  const setNavQuery = useShellStore((state) => state.setNavQuery)

  return (
    <div className="px-4 py-3">
      <Input
        value={navQuery}
        onChange={(event) => setNavQuery(event.target.value)}
        placeholder="Search pages"
        aria-label="Search pages"
        className="text-sm"
      />
    </div>
  )
}
