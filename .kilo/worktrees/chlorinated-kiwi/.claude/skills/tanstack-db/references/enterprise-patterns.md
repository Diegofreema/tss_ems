# Enterprise patterns

The rest of the skill teaches the API. This file is about using it well in a real,
long-lived application: how to structure collections, validate at the boundary,
handle failure gracefully, render on the server, manage lifecycle and memory, test,
and keep things fast and safe.

## Contents
- [Normalize, then join](#normalize)
- [Schemas as the write boundary](#schemas)
- [Error handling and rollback UX](#errors)
- [SSR and hydration (DbClient)](#ssr)
- [Collection lifecycle and memory](#lifecycle)
- [Sync modes for scale](#sync-modes)
- [Testing](#testing)
- [Performance](#performance)
- [Security and multi-tenant](#security)
- [Structuring a codebase](#structure)

## Normalize

The reason to adopt TanStack DB over ad-hoc fetching is **normalization**. Load
each entity type into its **own collection** once, keyed by id, and compose views
with live-query joins — rather than fetching bespoke nested payloads per screen.
This kills endpoint sprawl and network waterfalls: one `usersCollection`, one
`postsCollection`, one `commentsCollection`, and every screen is a query over them.

- One collection per entity type; `getKey` is the id.
- Build screen-specific shapes with joins and `select`, or nested `include`s for
  hierarchical data (see [live-queries.md](live-queries.md#includes)).
- Derive expensive aggregates once into a live-query collection and let other
  queries read from it — the engine keeps it incrementally maintained and shares
  it, so you compute it once.
- A live query is cheap and incremental, so prefer *many small focused queries*
  (each component subscribes to exactly what it shows) over one giant query whose
  result every component filters in JS.

## Schemas

Attach a Standard Schema (Zod, Valibot, ArkType, Effect) to a collection and it
becomes the **write boundary**: `insert` and `update` validate synchronously and
throw `SchemaValidationError` on bad input, and the schema's inferred type flows
through the whole collection.

```ts
import { z } from 'zod'

const todoSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Text is required'),
  completed: z.boolean(),
  priority: z.number().min(0).max(5),
})
type Todo = z.infer<typeof todoSchema>

const collection = createCollection(
  queryCollectionOptions({ schema: todoSchema, queryKey: ['todos'], queryFn, getKey: (t) => t.id }),
)
```

Two things to internalize:

- **Schemas validate client changes only** — the data you `insert`/`update`. They
  do **not** validate data coming *in* from your server/sync layer. If you don't
  trust the server payload, validate it yourself in `queryFn` (or use the
  collection's deserialization hooks where a sync engine provides them).
- **Use a schema *or* an explicit type param, not both.** `schema: todoSchema`
  gives you runtime validation *and* types; `createCollection<Todo>(…)` without a
  schema gives you types only (TS hints, no runtime checks). The schema is a
  `TInput → TOutput` transform boundary — pick it when you want validation.

Schemas with transforms are also how you map a sync engine's storage types to rich
JS types (SQLite TEXT → `Date`, INTEGER → boolean, TEXT → parsed JSON) — see the
PowerSync example in [collections.md](collections.md#powersync).

## Errors

Rollback is automatic — a thrown handler discards the optimistic overlay for you.
Your job is retry policy and user feedback.

- **Retries:** there is none built in. Wrap retryable calls inside the handler /
  `mutationFn` (see [mutations.md](mutations.md#errors) for a `withRetry` helper).
  Distinguish retryable (network, 5xx) from terminal (validation, 4xx) failures —
  don't retry a rejected write.
- **Feedback:** `await tx.isPersisted.promise` in a try/catch at the call site to
  show a toast on failure, or surface the error from `mutationFn`. For writes where
  a wrong guess is costly, use `{ optimistic: false }` and show a pending state
  until the server confirms.
- **Distinguish provisional rows in the UI:** the virtual property `$synced` (and
  `$origin`) on every result row tells you whether a row is confirmed yet — use it
  to grey out or disable actions on rows still persisting (e.g. disable a Delete
  button until `todo.$synced`).
- **Collection-level sync errors** surface via `collection.status === 'error'` and
  the `isError` flag on `useLiveQuery`; render a retry affordance that calls
  `collection.utils.refetch()`.

## SSR

Server rendering is the main reason to use the newer **`DbClient` / `DbProvider`**
style instead of module-level collections. The flow: create a client on the server,
preload the data you'll render, `dehydrate` it into the HTML, then rehydrate on the
client so the first paint has data and no refetch flash.

**Server — preload and dehydrate:**

```tsx
import { DbClient } from '@tanstack/react-db'

const dbClient = new DbClient()
await dbClient.preloadLiveQuery({
  query: (q) =>
    q.from({ todo: todoCollection }).where(({ todo }) => eq(todo.status, 'open'))
     .select(({ todo }) => ({ id: todo.id, title: todo.title })),
})
const state = dbClient.dehydrate({
  shouldDehydrateCollection: () => false, // ship query-result snapshots, not whole collections
  shouldDehydrateLiveQuery: () => true,
})
```

**Client — hydrate under a provider:**

```tsx
import { DbClient, DbProvider, HydrationBoundary } from '@tanstack/react-db'

function App({ dehydratedDbState }) {
  const [dbClient] = React.useState(() => new DbClient())
  return (
    <DbProvider client={dbClient}>
      <HydrationBoundary state={dehydratedDbState}>
        <Routes />
      </HydrationBoundary>
    </DbProvider>
  )
}
```

Read hydrated data with **`useLiveSuspenseQuery`** inside a `<Suspense>` boundary so
streamed rows render as they arrive. Framework hooks:

- **TanStack Start:** wrap the router with `routerWithDbClient(router, dbClient)`
  and put the `DbClient` in router context.
- **Next.js App Router:** `preloadLiveQuery` in the server component, then render a
  `<DbHydration state={state}>` wrapper around a `<Suspense>` boundary.
- **Incremental/streamed hydration:** `dbClient.applyCollectionChunk({ collectionId,
  rows, syncMeta })` feeds rows in as they stream.

**Data precedence during init** (lowest → highest): per-materialization
`initialData` → persisted rows → hydrated rows, and a fresh adapter sync supersedes
all three. Hydrated rows are treated as provisional base state until real sync
arrives — which is exactly what you want for a fast first paint that self-corrects.

React Native has no SSR, so this whole section is web-only; stay on module-level
collections there.

## Lifecycle

A collection has a `status`: `idle` → `loading` → `ready` (and `error`,
`cleaned-up`). Sync is **eager by default** (starts immediately). Set
`startSync: false` for **lazy** sync that starts on the first subscriber — good for
collections that aren't needed on every screen.

Useful methods and utilities:

```ts
await collection.preload()                              // force initial sync (e.g. in a route loader)
const item = collection.get('id')                       // one row by key
const all = collection.toArray()                        // snapshot as array
const unsub = collection.subscribeChanges((changes) => {}) // low-level change stream
await collection.utils.refetch({ throwOnError: false }) // manual refresh (query collection)
await collection.cleanup()                              // stop syncing, cancel requests, free memory
```

**Memory:** live-query collections have a `gcTime` (default 5000ms) after which an
unused result is garbage-collected; the underlying query cache honours TanStack
Query's `gcTime`. In long-running apps (and especially RN, where you may create
per-screen live queries), let unused queries clean themselves up rather than
holding references, and call `collection.cleanup()` for collections you truly no
longer need. Sharing identical query keys means sharing cache entries — cleaning up
one consumer can affect another using the same key.

## Sync modes

Match the sync mode to the dataset size:

- **eager** (default) — sync the whole collection up front. Fine under ~10k rows.
- **on-demand** — sync only the subset a live query needs; predicates are pushed
  down to `queryFn` (via `ctx.meta.loadSubsetOptions`) or to the sync engine (e.g.
  PowerSync Sync Streams via `onLoadSubset`). Use it above ~50k rows or when a table
  is far larger than any one screen needs.
- **progressive** — serve a subset immediately and finish syncing the full set in
  the background, so the UI is usable at once and completes silently.

For very large tables, on-demand + narrow live-query `where` clauses is what keeps
memory and initial-sync time bounded.

## Testing

- **Unit-test live queries with `queryOnce`** — build the query, get a one-shot
  snapshot, assert on it, no subscription to tear down. Ideal for verifying join /
  filter / aggregation logic in isolation.
- **Use `localOnlyCollectionOptions` with `initialData`** as a fixture store. Seed
  it with known rows and run your real queries and actions against it — no network,
  fully deterministic.
- **Assert optimistic behaviour by awaiting the transaction:** call the action,
  read the live result immediately to confirm the optimistic overlay, then
  `await tx.isPersisted.promise` and assert the reconciled state. Test the failure
  path by making the handler throw and asserting the overlay rolled back.
- **`subscribeChanges`** lets you assert that exactly the expected inserts/updates/
  deletes fired.

## Performance

- Prefer the **declarative operators** over `.fn.*` variants — only the declarative
  form can be optimized and indexed. Reserve `.fn.where/.select/.having` for logic
  the operators can't express, and give them an explicit `queryKey`.
- **Scope queries tightly.** A component should subscribe to the smallest result it
  needs; incremental recomputation is cheap, but a component still re-renders when
  *its* result changes, so narrower results mean fewer renders.
- **Reuse derived collections.** Compute an aggregate or filtered set once as a
  live-query collection and read it from many places; don't recompute the same
  join in every component.
- **Batch related writes** in a `createTransaction` so they persist as one unit and
  the handler makes one round trip instead of N.
- **Debounce/throttle high-frequency writes** (typing, sliders, drag) with
  `usePacedMutations` so you don't flood the backend.
- On RN, live queries are safe in list screens — the ~0.7ms/row incremental updates
  mean scrolling and updates stay smooth.

## Security

- **Client-side schemas are UX, not enforcement.** They validate before a write
  leaves the device; they do not secure anything. **Always re-validate and
  authorize on the server** — a client can be bypassed.
- **Never trust optimistic state as truth.** The authoritative value is what syncs
  back from the server; the overlay is a guess. Reconcile, and let the server's
  version win.
- **Multi-tenant scoping:** filter at the *sync/fetch* layer, not just the live
  query. A `where` on a live query hides rows in the UI, but if the collection
  synced every tenant's rows into the client, they're on the device. Scope the
  `queryFn` / shape / sync stream to the current tenant so foreign rows never
  arrive. (This is the local-first version of "don't send data the user can't
  see".)
- **Encrypt sensitive local data at rest** where the platform allows — a custom
  `storage` adapter for the localStorage collection, or the sync engine's
  encryption options for SQLite-backed stores. Local-first means real data sits on
  the device.

## Structure

A layout that scales:

```
src/
  db/
    client.ts        # QueryClient (+ DbClient if using the provider style)
    collections/
      todos.ts       # one file per collection: options, schema, handlers, exports
      users.ts
    queries/         # reusable named live-query collections / Query builders
    actions/         # createOptimisticAction / createPacedMutations instances
```

- Define each collection in its own module and export it; components import the
  collection, not a fetch function.
- Keep reusable predicates (`Ref<T>` helpers) and named queries in `queries/` so
  screens compose from a shared vocabulary.
- Put shared paced-mutation instances in `actions/` so multiple components share a
  queue.
- Collections defined at module scope initialize once; that's the intended pattern
  for the non-provider style. If you need per-request isolation (SSR, tests), use
  the `DbClient` provider style so each client is independent.
