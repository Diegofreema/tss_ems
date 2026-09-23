import { createFileRoute } from '@tanstack/react-router'
import { AdminSearchPage } from '@/portals/admin/features/search/search-page'

export const Route = createFileRoute('/admin/search')({
  staticData: { title: 'Search', crumb: 'School' },
  /*
   * The page itself reads these with nuqs, which goes to the URL directly.
   * They are declared here so the header's box can navigate to this route
   * *with* a term — a search param the router has never heard of is not a
   * search param it will let anything link to.
   */
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    limit: typeof search.limit === 'string' ? search.limit : undefined,
  }),
  component: AdminSearchPage,
})
