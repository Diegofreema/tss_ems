---
name: tanstack-db
description: >-
  Build fast, local-first apps with TanStack DB — the reactive client store that
  loads data into normalized collections, runs sub-millisecond live queries, and
  applies instant optimistic writes. Use this whenever you are building or
  reviewing a React or React Native app that uses @tanstack/react-db,
  @tanstack/db, queryCollectionOptions, electric/powersync/rxdb/trailbase
  collections, useLiveQuery, useLiveSuspenseQuery, createOptimisticAction, or
  createTransaction — and any time the user mentions local-first, offline-first,
  optimistic UI, live queries, a "reactive store", syncing a client cache, or
  wiring TanStack Query into a normalized client store. Reach for it even when
  the user says "make the UI feel instant" or "sync data offline" without naming
  the library, since TanStack DB is the tool this skill covers for those goals.
  This is specifically the TanStack DB library — not plain TanStack Query
  caching, and not other realtime/live-query stacks like Firestore or Supabase
  realtime.
---

# Building local-first apps with TanStack DB

TanStack DB is a **reactive client store** that sits between your data source and
your components. You load data into typed **collections**, read it with **live
queries** that recompute incrementally in under a millisecond, and change it with
**optimistic mutations** that apply locally the instant a user acts and roll back
on their own if the server rejects them.

The point of it is to take the network off the interaction path. In a traditional
app, a click fires a request and the UI waits. With TanStack DB the click updates
a local overlay immediately, the write is sent in the background, and when the
server's version syncs back the overlay quietly dissolves into the real data. The
user never waits on the round trip.

This skill covers how to use it well in **React and React Native**, from a first
collection through the patterns enterprise apps actually need. It is grounded in
the official docs (`https://tanstack.com/db/latest`). The library is in **beta
(0.x)** — pin your versions and expect the occasional breaking change.

## The mental model — three pillars

Everything in TanStack DB is one of these three things. Hold them in your head and
the rest of the API follows.

1. **Collections** — typed, normalized sets of objects, keyed by `getKey`. A
   collection is *where data lives* and *how it stays fresh*. The collection
   *type* you pick (query-backed, sync-engine-backed, or local) decides where the
   data comes from and whether it survives a restart. Data loading is decoupled
   from your components — you define a collection once and any component can read
   it.

2. **Live queries** — SQL-like, fully reactive reads over one or more collections.
   `from / where / select / join / groupBy / orderBy` compose a query that
   **recomputes only the rows that changed** (differential dataflow), so a
   one-row change in a sorted 100k-item collection updates in ~0.7ms. In React you
   read them with `useLiveQuery`; a component re-renders only when *its* result
   actually changes.

3. **Optimistic mutations** — `insert` / `update` / `delete` apply an immediate
   local overlay on top of the immutable synced data, then a handler persists to
   your backend. When the write confirms, the overlay is dropped in favour of the
   real synced row. If the handler throws, the overlay is rolled back
   automatically. There is **no automatic retry**.

## The package landscape

Get this right first — most early confusion is import confusion.

| Package | What it is | When you import it |
|---|---|---|
| `@tanstack/db` | Framework-agnostic core: collection model, live-query engine, mutation machinery | Vanilla JS / non-React, or for `createTransaction` types |
| `@tanstack/react-db` | **React + React Native binding.** Re-exports the core plus `useLiveQuery`, `useLiveSuspenseQuery`, `createCollection`, `createOptimisticAction`, `usePacedMutations` | **Almost always. This is your main import in any React or RN app** |
| `@tanstack/query-db-collection` | `queryCollectionOptions` — loads a REST/GraphQL API into a collection using TanStack Query as the fetcher | You're syncing your own HTTP API |
| `@tanstack/electric-db-collection` etc. | One package per sync engine (Electric, PowerSync, RxDB, TrailBase) | You're using that sync engine |

**TanStack DB extends TanStack Query — it does not replace it.** If you only need
to fetch and cache server state with no cross-collection live joins and no
client-side reactive queries, plain TanStack Query is simpler; stay there. Reach
for TanStack DB when you want normalized collections, live queries across them,
and instant optimistic writes. You rarely import `@tanstack/db` directly in an
app — `@tanstack/react-db` pulls the core in for you.

## Install

```bash
# React web, syncing your own HTTP API (the most common starting point)
npm install @tanstack/react-db @tanstack/query-db-collection @tanstack/query-core

# React Native adds ONE required polyfill (see references/react-native.md)
npm install react-native-random-uuid
```

Sync-engine and local collections have their own install lines — see
[references/collections.md](references/collections.md).

## The canonical loop

This is the whole library in one screen: **define a collection → read it with a
live query → mutate it directly.** This uses the simple, module-level
`createCollection` style that nearly all the docs use and that works identically
in React and React Native. (For the newer `DbClient`/`DbProvider` style used for
SSR, see the API-style note below.)

```tsx
import { createCollection, useLiveQuery, eq } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { QueryClient } from '@tanstack/query-core'

const queryClient = new QueryClient()

// 1. Define the collection once, at module scope.
export const todoCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['todos'],
    queryFn: async () => (await fetch('/api/todos')).json(),
    queryClient,
    getKey: (todo) => todo.id,
    // Handlers persist optimistic writes to your backend.
    onInsert: async ({ transaction }) => {
      const { modified } = transaction.mutations[0]
      await fetch('/api/todos', { method: 'POST', body: JSON.stringify(modified) })
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      await fetch(`/api/todos/${original.id}`, { method: 'PATCH', body: JSON.stringify(changes) })
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await fetch(`/api/todos/${original.id}`, { method: 'DELETE' })
    },
  }),
)

function TodoList() {
  // 2. Read reactively. This component re-renders only when the result changes.
  const { data: todos } = useLiveQuery({
    query: (q) =>
      q
        .from({ todo: todoCollection })
        .where(({ todo }) => eq(todo.completed, false))
        .orderBy(({ todo }) => todo.createdAt, 'desc'),
  })

  // 3. Mutate directly. The UI updates instantly; the handler persists in the background.
  const toggle = (todo) =>
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed
    })

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} onClick={() => toggle(todo)}>{todo.text}</li>
      ))}
    </ul>
  )
}
```

That is the shape of every feature you will build. The depth is in *which*
collection you choose, *how* you compose the query, and *how* you handle the
write — which is what the reference files are for.

## Which collection type should you use?

This is the most important design decision, so make it deliberately. Local-first
means **the data lives on the device and the app works offline** — that requires a
collection that actually persists locally, which narrows the field a lot.

| You have… | Use | Notes |
|---|---|---|
| Your own REST/GraphQL API, online-ish app | `queryCollectionOptions` | Not offline-first on its own; refetches full state. The default for brownfield adoption |
| Postgres + want real-time web sync | `electricCollectionOptions` | Real-time shapes over HTTP; **no documented offline persistence** |
| Postgres/MongoDB/MySQL + true offline, **web or React Native** | `powerSyncCollectionOptions` | **The offline-first pick.** On-device SQLite, offline queue, conflict resolution. The only sync collection whose docs list RN explicitly |
| Flexible backend (Supabase/GraphQL/CouchDB/REST/P2P), choose your storage | `rxdbCollectionOptions` | Offline-first; RxDB owns persistence + replication. RN-capable via RxDB's own SQLite adapters |
| Self-hosted single-binary backend | `trailBaseCollectionOptions` | Real-time; no documented offline/RN |
| Ephemeral UI state (modals, filters, wizard steps) | `localOnlyCollectionOptions` | In-memory, no persistence, no cross-tab |
| Small persisted state (prefs, drafts) on **web** | `localStorageCollectionOptions` | Auto-persists + cross-tab sync. **Default backend does not exist in React Native** |

**Quick rules of thumb:**
- **Local-first React *web*** → PowerSync or RxDB. (Electric and TrailBase are
  real-time-sync, not documented as offline stores.)
- **Local-first React *Native*** → **PowerSync first** (documented RN + on-device
  SQLite + offline by default), RxDB second.
- **Just make my existing API feel instant, online** → `queryCollectionOptions`.
  You get optimistic writes and live queries without changing your backend.

Full options, setup code, and a guide to writing your own custom collection
adapter are in [references/collections.md](references/collections.md). React
Native persistence specifics are in
[references/react-native.md](references/react-native.md).

## The rules that will bite you

These are the non-obvious things that cause real bugs. Internalize them; they save
hours.

- **`getKey` must return a stable, unique `string | number` per item.** It is how
  optimistic overlays match their confirmed rows and how React keys stay stable.
  Prefer generating IDs client-side with `crypto.randomUUID()` so the key you
  insert with is the key the server keeps. (In React Native this needs a polyfill
  — see below.)

- **Mutation handlers must not resolve until the server change has synced back.**
  If a handler resolves early, the optimistic overlay is dropped before the real
  data arrives and the row flickers or vanishes. For a query collection this means
  letting the automatic refetch complete; for Electric it means awaiting the
  `txid`. **Never call `collection.preload()` or `loadSubset()` inside a handler —
  it deadlocks.**

- **`update` takes its options *before* the mutator function.** It is
  `update(key, { metadata, optimistic }, (draft) => …)`, not after. And you
  **mutate the draft's properties** — never reassign `draft` itself
  (`draft.done = true` ✅, `draft = {...}` ❌). It's Immer under the hood.

- **`where` uses SQL three-valued logic, not JavaScript.** Any comparison
  involving `null`/`undefined` evaluates to UNKNOWN, so the row is *excluded*.
  `eq(user.middleName, null)` will not match rows where it's null — this surprises
  people constantly.

- **The functional variants (`.fn.where`, `.fn.select`, `.fn.having`) can't be
  optimized or indexed.** They run arbitrary JS per row. Use them only when the
  declarative operators genuinely can't express the logic, and pass an explicit
  `queryKey` when you do (the engine can't derive identity from opaque functions).

- **`queryFn` returns the *complete* state of the collection.** Returning `[]`
  deletes everything. For partial/large datasets use `syncMode: 'on-demand'`
  rather than a `queryFn` that returns a subset.

- **Failed mutations do not retry automatically.** If you need retries, wrap the
  call inside your handler / `mutationFn`.

- **Collections are in-memory by default.** On the web that's fine per-session; on
  mobile the OS evicts your process and everything is gone on restart unless you
  use a persisting collection (PowerSync, RxDB, or the SQLite persistence layer).
  See [references/react-native.md](references/react-native.md).

- **React Native needs `import "react-native-random-uuid"` at your entry point.**
  The core uses `crypto.randomUUID()`, which Hermes lacks, and id generation will
  throw without it.

## A note on the two API styles

The docs are mid-transition and you'll see two shapes in the wild:

- **Module-level `createCollection` (what this skill uses by default).** Define
  collections at module scope, import them directly, read with `useLiveQuery`. No
  provider. This is what the collections, mutations, and live-query guides use, it
  works identically on web and React Native, and it's the simplest thing that
  works. **Prefer it** unless you need SSR.

- **`DbClient` + `DbProvider` + `collectionOptions(id, (client) => …)`.** A newer
  dependency-injection style where collections are descriptors resolved through a
  client you put in React context, and you read the collection with
  `useDbClient().collection(desc)`. Its real payoff is **SSR and hydration**
  (`dehydrate` / `HydrationBoundary`, TanStack Start, Next.js). If you're doing
  server rendering, use this style and see the SSR section in
  [references/enterprise-patterns.md](references/enterprise-patterns.md). React
  Native has no SSR, so you'll almost always stay on the module-level style there.

Both wrap the *same* collection options (`queryCollectionOptions`, etc.) — the
difference is only how the collection gets instantiated and reached.

## Where to go next

Load the reference file that matches what you're doing. Each is self-contained and
code-heavy so you can work straight from it.

- **[references/collections.md](references/collections.md)** — Every collection
  type with full options and setup code (query, local-only, local-storage,
  Electric, PowerSync, RxDB, TrailBase), how to choose, and how to write a custom
  sync adapter with the `begin/write/commit/markReady` lifecycle. Read this when
  setting up or changing where data comes from.

- **[references/live-queries.md](references/live-queries.md)** — The complete query
  builder: all operators and functions, joins, subqueries, nested `include`s,
  aggregations, `distinct`/`findOne`, ordering, the `useLiveQuery` vs
  `useLiveSuspenseQuery` decision, conditional/disabled queries, `queryKey`, and
  reactive `createEffect`. Read this when writing anything more than a trivial
  read.

- **[references/mutations.md](references/mutations.md)** — Optimistic writes end to
  end: `insert`/`update`/`delete`, the handler contract, `createOptimisticAction`
  for multi-collection intents, `createTransaction` for manual batching,
  non-optimistic writes, paced mutations (debounce/throttle/queue), transaction
  lifecycle, and the temp-ID → real-ID problem. Read this when writing data.

- **[references/react-native.md](references/react-native.md)** — RN setup, the
  required UUID polyfill, why the in-memory store isn't durable on mobile, the
  SQLite persistence options (op-sqlite persistence layer, PowerSync, RxDB),
  native-module/Expo caveats, and what does *not* work (localStorage collection).
  Read this for any React Native target.

- **[references/enterprise-patterns.md](references/enterprise-patterns.md)** —
  Normalization and cross-collection joins, schema validation as a write boundary,
  error handling and rollback UX, SSR/hydration with `DbClient`, collection
  lifecycle (`status`, `preload`, `cleanup`, lazy sync), testing, performance, and
  security notes. Read this when hardening an app for production.
