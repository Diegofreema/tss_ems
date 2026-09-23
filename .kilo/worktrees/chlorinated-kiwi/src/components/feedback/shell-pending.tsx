import { SidebarBrand } from '@/components/layout/sidebar/sidebar-brand'
import type { PortalConfig } from '@/lib/portal'
import { useShellStore } from '@/stores/shell.store'
import { cn } from '@/lib/utils'
import { RoutePending } from './route-pending'
import { Shimmer } from './shimmer'

/**
 * What a portal shows while it is opening, as that shell route's own
 * `pendingComponent`.
 *
 * The first sign-in on a device is the one time this is on screen long enough
 * to be read: there is no cached account, so the guard waits on `/users/me`
 * before the shell may render at all. Left to the default page skeleton, that
 * wait drew three grey bars in the top-left of an empty white document and
 * then, in one frame, replaced them with a 248px sidebar, a header and a
 * padded page — the whole application arriving as a jump-cut. Somebody's first
 * impression of the portal was a screen that looked broken and then looked
 * like something else.
 *
 * So the pending state is the shell: the same rail at the same width, the same
 * bordered header at the same height, the same 1280px content column. Only the
 * contents are grey, and when the account lands they fill in where they
 * already were.
 *
 * What is drawn for real is what is already known without asking the school —
 * the brand mark and which portal is opening, both static per route. The nav
 * is not: a visitor who has signed into the wrong portal is about to be sent
 * to `/wrong-portal`, and the labels of a register they may not open have no
 * business flashing up on the way. Placeholders make the same shape and claim
 * nothing.
 *
 * Built per portal, the same way `portalNotFound` is, because the shell route
 * is the only place that knows which portal it is.
 */
export const shellPending = (config: PortalConfig) => () => {
  // The number of grey headings matches the real nav's, so the rail does not
  // visibly lengthen when it fills in. Groups start collapsed, so what is on
  // screen at first paint is the ungrouped block's items and then a run of
  // headings — which is exactly what this draws.
  const [first, ...groups] = config.nav
  const items = first?.items.length ?? 3
  // The same width the reader left the rail at, or the shell arrives one width
  // and settles at another — which is the jump-cut this whole file exists to
  // avoid, reintroduced by the fold.
  const railShut = useShellStore((state) => state.railShut)

  return (
    <div
      className="flex min-h-dvh bg-background text-foreground"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Opening the {config.roleLabel} portal</span>

      {/* Hidden below the design's 900px breakpoint, where the real sidebar is
          a drawer rather than a rail — see `useBreakpoint('narrow')`. */}
      <aside
        data-rail={railShut ? 'shut' : 'open'}
        className={cn(
          'group sticky top-0 z-40 hidden h-dvh flex-none flex-col border-r border-divider bg-raised min-[900px]:flex',
          railShut ? 'w-(--rail-shut)' : 'w-(--rail-open)',
        )}
      >
        <SidebarBrand />

        <nav className="flex-1 space-y-1.5 overflow-hidden px-4 pb-6">
          {Array.from({ length: items }, (_, index) => (
            <div
              key={index}
              className="flex h-(--rail-row) items-center gap-3 px-3 group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0"
            >
              <Shimmer className="size-5 flex-none rounded-md" delay={index * 40} />
              <Shimmer className="rail-wordy h-3 flex-1 rounded-sm" delay={index * 40} />
            </div>
          ))}

          {groups.map((group, index) => (
            <div
              key={group.heading ?? index}
              className="flex h-(--rail-row) items-center gap-3 px-3 group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0"
            >
              <Shimmer className="size-5 flex-none rounded-md" delay={(items + index) * 40} />
              <Shimmer className="rail-wordy h-3 w-28 rounded-sm" delay={(items + index) * 40} />
            </div>
          ))}
        </nav>

        <div className="px-4 pb-(--rail-foot)">
          <div className="flex h-(--rail-row) items-center gap-3 px-3 group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0">
            <Shimmer className="size-5 flex-none rounded-md" />
            <Shimmer className="rail-wordy h-3 w-20 rounded-sm" delay={60} />
          </div>
          <div className="flex h-(--rail-row) items-center gap-3 px-3 group-data-[rail=shut]:justify-center group-data-[rail=shut]:gap-0">
            <Shimmer className="size-5 flex-none rounded-md" delay={80} />
            <Shimmer className="rail-wordy h-3 w-16 rounded-sm" delay={120} />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-ground">
        <header className="sticky top-0 z-20 flex h-(--shell-header) items-center gap-3 border-b border-divider bg-raised px-content">
          {/* The menu button: the drawer's at a narrow width, the rail's fold
              above it. There is one at every width now, so it is not hidden. */}
          <Shimmer className="size-10 flex-none rounded-lg" />

          {/* The search box, on the portal that has one. */}
          {config.searchPath && (
            <Shimmer className="hidden h-10 w-96 rounded-lg md:block" />
          )}

          <div className="flex-1" />

          {/* One circle per control the header will actually carry: the
              messages door where the portal has one, the bell, the theme
              switch — then whoever is signed in. */}
          {config.messagesPath && (
            <Shimmer className="size-10 flex-none rounded-full" delay={120} />
          )}
          <Shimmer className="size-10 flex-none rounded-full" delay={160} />
          <Shimmer className="size-10 flex-none rounded-full" delay={200} />
          <Shimmer className="h-12 w-44 flex-none rounded-lg" delay={240} />
        </header>

        <div className="mx-auto w-full max-w-[1280px] flex-1 p-content">
          <RoutePending />
        </div>
      </main>
    </div>
  )
}
