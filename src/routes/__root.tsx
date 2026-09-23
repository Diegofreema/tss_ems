import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from '@tanstack/react-router';
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router';

// const Devtools = import.meta.env.PROD
//   ? () => null
//   : lazy(async () => {
//       const [router, query] = await Promise.all([
//         import('@tanstack/react-router-devtools'),
//         import('@tanstack/react-query-devtools'),
//       ])
//       return {
//         default: () => (
//           <>
//             <router.TanStackRouterDevtools position="bottom-left" />
//             <query.ReactQueryDevtools buttonPosition="bottom-right" />
//           </>
//         ),
//       }
//     })

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <NuqsAdapter>
      <Outlet />
      <Toaster position="bottom-center" />
      {/* <Suspense>
        <Devtools />
      </Suspense> */}
    </NuqsAdapter>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-content">
      <div className="w-full max-w-md">
        <div className="font-heading text-numeral leading-none font-extrabold text-brand">
          404
        </div>
        <h1 className="mt-4 text-detail-title">There is no page here</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to the home page</Link>
        </Button>
      </div>
    </div>
  );
}
