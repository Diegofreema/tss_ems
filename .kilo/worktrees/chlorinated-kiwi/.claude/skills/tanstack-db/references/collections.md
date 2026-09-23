# Collections — every type, and how to choose

A collection is a typed, normalized set of objects with a `getKey`. What makes one
collection different from another is **where its data comes from** and **whether it
persists**. This file covers all the built-in collection types, their full
options, and how to write your own adapter.

Everything shares the same shape: `createCollection(<type>CollectionOptions({ … }))`
from `@tanstack/react-db`, then you read with live queries and write with
`.insert()` / `.update()` / `.delete()`.

## Contents
- [Universal options](#universal-options)
- [Choosing a collection type](#choosing)
- [queryCollectionOptions — sync your own API](#query-collection)
- [localOnlyCollectionOptions — ephemeral UI state](#local-only)
- [localStorageCollectionOptions — small persisted state (web)](#local-storage)
- [electricCollectionOptions — Postgres real-time (web)](#electric)
- [powerSyncCollectionOptions — offline-first, web + RN](#powersync)
- [rxdbCollectionOptions — flexible local-first](#rxdb)
- [trailBaseCollectionOptions — self-hosted backend](#trailbase)
- [Writing a custom collection adapter](#custom-adapter)

## Universal options

Present on essentially every collection type:

- **`getKey: (item) => string | number`** — *required.* Must be unique and stable
  per item. Prefer client-generated UUIDs so the optimistic key matches the
  server's.
- **`id?: string`** — optional identifier, handy for debugging and for `queryKey`
  composition.
- **`schema?`** — a Standard Schema validator (Zod, Valibot, ArkType, Effect). It
  validates *client writes only* and gives you type inference. See
  [enterprise-patterns.md](enterprise-patterns.md#schemas).
- **`onInsert` / `onUpdate` / `onDelete`** — write-back handlers. What they must do
  differs by type (persist to a server, or run a side effect); details per type
  below and in [mutations.md](mutations.md).

## Choosing

| Data source | Collection | Offline? | React Native? |
|---|---|---|---|
| Your REST/GraphQL API | `queryCollectionOptions` | No (refetches) | Yes (it's just fetch) |
| Postgres, real-time | `electricCollectionOptions` | Not documented | Not documented |
| Postgres/Mongo/MySQL, offline-first | `powerSyncCollectionOptions` | **Yes, default** | **Yes (documented)** |
| Supabase/GraphQL/CouchDB/REST/P2P | `rxdbCollectionOptions` | **Yes** | Yes (RxDB's SQLite adapters) |
| Self-hosted single binary | `trailBaseCollectionOptions` | Not documented | Not documented |
| Ephemeral UI state | `localOnlyCollectionOptions` | n/a (in-memory) | Yes |
| Small persisted state | `localStorageCollectionOptions` | Per-device (web) | **No** (no localStorage in RN) |

For **local-first**, that table collapses to: **web → PowerSync or RxDB; React
Native → PowerSync (first choice) or RxDB.** Electric and TrailBase are real-time
sync layers, not documented offline stores. `queryCollectionOptions` is the
pragmatic choice when you just want optimistic UI over an existing API and aren't
truly offline.

---

## query collection

Loads a collection from your own HTTP API using TanStack Query as the fetcher.
This is the usual entry point for brownfield apps.

```bash
npm install @tanstack/query-db-collection @tanstack/query-core @tanstack/db
```

```ts
import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { QueryClient } from '@tanstack/query-core'

const queryClient = new QueryClient()

const todosCollection = createCollection(
  queryCollectionOptions({
    queryKey: ['todos'],
    queryFn: async () => (await fetch('/api/todos')).json(),
    queryClient,
    getKey: (todo) => todo.id,
    schema: todoSchema,               // optional
    // syncMode: 'on-demand',         // for large/paginated datasets
    // startSync: false,              // lazy: sync on first subscriber
    onInsert: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.create(m.modified)))
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.update(m.key, m.changes)))
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.delete(m.key)))
    },
  }),
)
```

**Key behaviours:**

- **The `queryFn` result is the complete state of the collection.** Returning `[]`
  deletes every row. Don't return a filtered subset — use `syncMode: 'on-demand'`.
- **After a handler resolves, the collection auto-refetches** to reconcile with the
  server. Return `{ refetch: false }` from a handler to skip that (e.g. when you
  already wrote the authoritative row back yourself). Return nothing or
  `{ refetch: true }` to force it.
- **`select`** extracts the array from an enveloped response and keeps the original
  envelope in cache: `select: (response) => response.items`.
- **Passthrough TanStack Query options:** `enabled`, `staleTime`, `gcTime`,
  `refetchInterval`, `retry`, `refetchOnWindowFocus`, `initialData`, `meta`, etc.

**Direct-write utilities** — write into the synced store without a refetch (great
for WebSocket-pushed updates or writing back server-computed fields):

```ts
todosCollection.utils.writeInsert(item)
todosCollection.utils.writeUpdate(item)
todosCollection.utils.writeDelete(key)
todosCollection.utils.writeUpsert(item)
todosCollection.utils.writeBatch(() => { /* multiple writes, applied atomically */ })
await todosCollection.utils.refetch({ throwOnError: true })
```

**On-demand mode** (`syncMode: 'on-demand'`) pushes live-query predicates down into
`queryFn` via `ctx.meta.loadSubsetOptions`. Parse them with helpers from the
package:

```ts
import { parseLoadSubsetOptions } from '@tanstack/query-db-collection'

queryFn: async (ctx) => {
  const { filters, sorts, limit, offset } = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions)
  return api.todos.query({ filters, sorts, limit, offset })
}
```

Supported pushdown operators: `eq`, `gt`, `gte`, `lt`, `lte`, `and`, `or`, `in`.
If you use a dynamic `queryKey: (opts) => [...]`, the base key must be a prefix of
all derived keys.

---

## local only

In-memory, no persistence, no cross-tab sync — the fastest and simplest
collection. Use it for modal/sidebar state, filters, wizard steps, form drafts,
and client-computed data.

```ts
import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db'

const uiState = createCollection(
  localOnlyCollectionOptions({
    id: 'ui-state',
    getKey: (item) => item.id,
    initialData: [
      { id: 'sidebar', isOpen: false },
      { id: 'theme', mode: 'light' },
    ],
    // handlers are optional pre-confirm side effects (no server involved)
    onUpdate: async ({ transaction }) => {
      const { original, modified } = transaction.mutations[0]
      console.log('changed', original, '→', modified)
    },
  }),
)

uiState.update('theme', (draft) => { draft.mode = 'dark' })
```

---

## local storage

Persists to `localStorage` under a single `storageKey` and **auto-syncs across
browser tabs** via storage events. Writes persist immediately — handlers are
optional and only for side effects. Good for user preferences, persisted UI state,
recently-viewed lists, and small caches. **On the web only** — see the RN note
below.

```ts
import { createCollection, localStorageCollectionOptions } from '@tanstack/react-db'

const prefs = createCollection(
  localStorageCollectionOptions({
    id: 'user-preferences',
    storageKey: 'app-user-prefs', // the localStorage key
    getKey: (item) => item.id,
    // storage: sessionStorage,        // or a custom { getItem, setItem, removeItem }
    // storageEventApi: customEventBus, // custom { addEventListener, removeEventListener }
  }),
)

prefs.insert({ id: 'theme', mode: 'dark' }) // persisted + broadcast to other tabs instantly
```

A custom `storage` adapter lets you encrypt at rest:

```ts
const encryptedStorage = {
  getItem: (k) => { const v = localStorage.getItem(k); return v ? decrypt(v) : null },
  setItem: (k, v) => localStorage.setItem(k, encrypt(v)),
  removeItem: (k) => localStorage.removeItem(k),
}
```

> **React Native:** the default backend is `window.localStorage`, which does not
> exist in RN, so this collection does not work out of the box there. Its `storage`
> option needs a *synchronous* `getItem/setItem/removeItem` — MMKV (synchronous)
> can shim it, AsyncStorage (async) cannot. For real RN persistence use SQLite
> persistence, PowerSync, or RxDB instead. See
> [react-native.md](react-native.md).

---

## electric

Real-time sync from **PostgreSQL** via ElectricSQL "shapes" (filtered partial
replication) served over HTTP through a proxy you control. Positioned for
real-time *web* apps; the docs make **no offline-persistence claim**.

```bash
npm install @tanstack/electric-db-collection
```

```ts
import { createCollection } from '@tanstack/react-db'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'

const todos = createCollection(
  electricCollectionOptions({
    id: 'todos',
    schema: todoSchema,
    getKey: (item) => item.id,
    shapeOptions: {
      url: '/api/todos',          // your Electric proxy endpoint
      params: { table: 'todos' }, // shape params: table, where, columns
    },
    onInsert: async ({ transaction }) => {
      const res = await api.todos.create(transaction.mutations[0].modified)
      return { txid: res.txid } // block sync until this txid appears in the stream
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      const res = await api.todos.update({ where: { id: original.id }, data: changes })
      return { txid: res.txid }
    },
  }),
)
```

**Write confirmation** is the distinctive part. Electric matches your write to the
replication stream so the optimistic overlay drops at exactly the right moment.
Three ways, in order of preference:

1. **Return `{ txid }`** from the handler — the Postgres transaction id.
2. **`collection.utils.awaitTxId(txid, timeoutMs?)`** or `awaitMatch(predicate,
   timeoutMs?)` for custom matching.
3. **A plain timeout** (`await new Promise((r) => setTimeout(r, 2000))`) as a crude
   fallback.

> **Critical:** generate the txid *inside the same DB transaction as the write*
> (`SELECT pg_current_xact_id()::xid::text`), or it won't match the stream and
> `awaitTxId` will stall. Debug stalls with `localStorage.debug = 'ts/db:electric'`.

You need a server proxy that forwards Electric protocol params to your Electric
service and applies the shape's `table`/`where`/`columns`. See the Electric docs
for the proxy contract.

---

## powersync

The offline-first workhorse, and **the recommended local-first choice for React
Native.** Data lives in an on-device SQLite database; the collection mirrors it
reactively. Works offline by default — changes queue locally and sync when
connectivity returns, with conflict resolution and retries. Syncs bi-directionally
with **Postgres, MongoDB, or MySQL**. Supports Web, React Native, and Node.

```bash
# Web
npm install @tanstack/powersync-db-collection @powersync/web @journeyapps/wa-sqlite
# React Native
npm install @tanstack/powersync-db-collection @powersync/react-native @powersync/op-sqlite @op-engineering/op-sqlite
```

```ts
import { Schema, Table, column, PowerSyncDatabase } from '@powersync/web' // or @powersync/react-native
import { createCollection } from '@tanstack/react-db'
import { powerSyncCollectionOptions } from '@tanstack/powersync-db-collection'

const APP_SCHEMA = new Schema({
  documents: new Table({
    name: column.text,
    author: column.text,
    created_at: column.text,
    archived: column.integer,
  }),
})

const db = new PowerSyncDatabase({
  database: { dbFilename: 'app.sqlite' },
  schema: APP_SCHEMA,
})
db.connect(new Connector()) // your PowerSyncBackendConnector: fetchCredentials + uploadData

const documentsCollection = createCollection(
  powerSyncCollectionOptions({
    database: db,
    table: APP_SCHEMA.props.documents,
  }),
)
```

**SQLite stores only TEXT/INTEGER/etc.**, so use a schema with transforms to expose
rich JS types (Date, boolean, parsed JSON) to your app:

```ts
const taskSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  due_date: z.string().nullable().transform((v) => (v ? new Date(v) : null)),
  completed: z.number().nullable().transform((v) => (v != null ? v > 0 : null)),
  metadata: z.string().nullable().transform((v) => (v ? JSON.parse(v) : null)),
})

const tasks = createCollection(
  powerSyncCollectionOptions({ database: db, table: APP_SCHEMA.props.tasks, schema: taskSchema }),
)
// Query results now hand you real Date/boolean/object values.
```

**Options** include `schema`, `deserializationSchema`, `serializer`,
`onDeserializationError`, `syncBatchSize`, and `syncMode: 'eager' | 'on-demand'`
with `onLoad` / `onLoadSubset` (partial sync via PowerSync **Sync Streams** —
translate the live-query `where` with `extractSimpleComparisons` /
`parseWhereExpression`).

**Batched writes** use `PowerSyncTransactor` with a non-auto-commit transaction:

```ts
import { createTransaction } from '@tanstack/react-db'
import { PowerSyncTransactor } from '@tanstack/powersync-db-collection'

const batchTx = createTransaction({
  autoCommit: false,
  mutationFn: async ({ transaction }) => {
    await new PowerSyncTransactor({ database: db }).applyTransaction(transaction)
  },
})
batchTx.mutate(() => { for (let i = 0; i < 5; i++) documentsCollection.insert({ /* … */ }) })
await batchTx.commit()
await batchTx.isPersisted.promise
```

---

## rxdb

Puts **RxDB** underneath as the durable, local-first backend; TanStack DB sits on
top as the in-memory reactive query layer. RxDB owns persistence (localStorage /
IndexedDB / SQLite / Dexie) and replication (CouchDB, MongoDB, Supabase, REST,
GraphQL, WebRTC/P2P). Choose it when your backend isn't what PowerSync/Electric
cover, when you want P2P or GraphQL replication, or when you want to pick the
storage engine yourself. RN-capable via RxDB's own SQLite adapters (RxDB docs
cover the RN adapter setup — the TanStack page doesn't).

```bash
npm install @tanstack/rxdb-db-collection rxdb @tanstack/react-db
```

```ts
import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core'
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage'
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'
import { replicateRxCollection } from 'rxdb/plugins/replication'
import { createCollection } from '@tanstack/react-db'
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection'

const db = await createRxDatabase({
  name: 'my-todos',
  storage: wrappedValidateAjvStorage({ storage: getRxStorageLocalstorage() }),
  // In React Native: multiInstance: false, and an RN SQLite storage adapter
})

await db.addCollections({
  todos: {
    schema: {
      title: 'todos', version: 0, type: 'object', primaryKey: 'id',
      properties: {
        id: { type: 'string', maxLength: 100 },
        text: { type: 'string' },
        completed: { type: 'boolean' },
      },
      required: ['id', 'text', 'completed'],
    },
  },
})

replicateRxCollection({ collection: db.todos, pull: { handler: myPull }, push: { handler: myPush } })

const todosCollection = createCollection(
  rxdbCollectionOptions({ rxCollection: db.todos, startSync: true }),
)
```

Options: `rxCollection` (required), `id`, `schema`, `startSync` (default `true`),
`onInsert/onUpdate/onDelete` (override the built-in persistence handlers),
`syncBatchSize` (default `1000`).

---

## trailbase

Syncs from **TrailBase** — an easy-to-self-host single-binary backend with SQLite,
auth, admin UIs, and record APIs. Real-time updates arrive automatically when
`enable_subscriptions` is on. No documented offline/RN support.

```bash
npm install @tanstack/trailbase-db-collection @tanstack/react-db trailbase
```

```ts
import { createCollection } from '@tanstack/react-db'
import { trailBaseCollectionOptions } from '@tanstack/trailbase-db-collection'
import { initClient } from 'trailbase'

const client = initClient('https://your-trailbase-instance.com')

// Two type params: the server row shape and the app shape.
const todosCollection = createCollection<SelectTodo, Todo>(
  trailBaseCollectionOptions({
    id: 'todos',
    recordApi: client.records('todos'),
    getKey: (item) => item.id,
    schema: todoSchema,
    parse: { created_at: (ts) => new Date(ts * 1000) },        // from TrailBase
    serialize: { created_at: (d) => Math.floor(d.valueOf() / 1000) }, // to TrailBase
  }),
)
```

---

## Writing a custom collection adapter

When none of the built-ins fit — say you sync over a raw WebSocket, gRPC stream, or
a proprietary API — write your own collection options factory. It returns a
`CollectionConfig` that `createCollection` consumes. This is exactly how the
built-in adapters are built.

**The sync lifecycle** is the heart of it. Your `sync` function receives control
methods and pushes incoming server data into the collection:

```ts
const sync: SyncConfig<T>['sync'] = (params) => {
  const { begin, write, commit, markReady, markError, collection } = params
  // ... connect to your source, then on each incoming batch:
  //   begin()                              -> open a transaction
  //   write({ type: 'insert', value })     -> stage a change (omit value for delete)
  //   commit()                             -> apply the batch atomically
  //   markReady()                          -> call ONCE after the first full snapshot
  //   markError(err)                       -> initial sync failed before a usable snapshot
  return () => { /* cleanup: close sockets, clear timers */ }
}
```

**Mutation handlers** receive typed params so you can push local writes back to
your source. Insert mutations carry `modified` (full item), updates carry `changes`
(partial), deletes carry only `key`:

```ts
interface CollectionConfig<TItem extends object> {
  id?: string
  schema?: StandardSchemaV1
  getKey: (item: TItem) => string | number
  sync?: SyncConfig<TItem>
  rowUpdateMode?: 'partial' | 'full'
  onInsert?: InsertMutationFn<TItem> // params.transaction.mutations[i].modified
  onUpdate?: UpdateMutationFn<TItem> // .changes
  onDelete?: DeleteMutationFn<TItem> // .key
}
```

**Two authoring patterns:**
- **Pattern A** — pass the user's `onInsert/onUpdate/onDelete` straight through
  (used by query and Electric collections).
- **Pattern B** — implement the handlers *inside* your factory against your API and
  `Omit<CollectionConfig, 'onInsert' | 'onUpdate' | 'onDelete'>` from the config
  type (used by TrailBase and RxDB collections).

Return the config plus an optional `utils` object; whatever you put in `utils` is
exposed on the collection as `collection.utils.*` (e.g. `reconnect`,
`getConnectionState`).

A complete, verbatim WebSocket adapter (connect, handle `sync`/`insert`/`update`/
`delete`/`transaction`/`ack` messages, reconnect with backoff, and confirm writes
by transaction id) is worth copying from the official
[collection-options-creator guide](https://tanstack.com/db/latest/docs/guides/collection-options-creator)
— it's long but it's the canonical template. The shape is: build `sync` as above,
build a `sendTransaction` that serializes `params.transaction.mutations` to your
wire format and resolves when the server acks, wire it to `onInsert/onUpdate/
onDelete`, and return `{ id, schema, getKey, sync: { sync }, onInsert, onUpdate,
onDelete, utils }`.
