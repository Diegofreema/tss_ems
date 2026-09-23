# TanStack DB in React Native

The good news: **the same `@tanstack/react-db` you use on the web works in React
Native.** The core is plain JavaScript with no DOM dependency, so it runs under
Hermes unchanged — collections, live queries, and optimistic mutations behave
identically. There is no separate RN binding and no RN-specific hooks; you import
`useLiveQuery`, `createCollection`, `createOptimisticAction`, etc. from the same
package.

What *is* different on mobile is **persistence** and a couple of missing web APIs.
Get those right and everything else is the same skill you already know.

## Contents
- [The one required polyfill](#polyfill)
- [Why the in-memory store isn't enough on mobile](#durability)
- [Persistence options, ranked](#persistence)
- [What does NOT work in RN](#not-working)
- [Native module / Expo caveats](#native-modules)
- [A minimal RN setup](#minimal-setup)

## Polyfill

TanStack DB generates ids with `crypto.randomUUID()`, which Hermes does not
provide. **Import the polyfill once at your app's entry point** (before any
collection is created) or id generation will throw:

```ts
// index.js / App entry — very first import
import 'react-native-random-uuid'
```

```bash
npm install react-native-random-uuid
```

This is the single non-negotiable RN setup step. Everything else depends on which
persistence path you choose.

## Durability

TanStack DB's core store lives **in memory**. On the web that's fine within a
session. On mobile, the OS routinely evicts backgrounded app processes, so an
in-memory-only collection loses **everything** on the next cold start. For a
local-first mobile app that's a non-starter.

Durability does not come from `@tanstack/react-db` itself — it comes from the
**collection type you choose**. So the RN persistence question is really a
collection-choice question.

## Persistence

Ranked for a local-first React Native app:

### 1. PowerSync — the recommended default

The only sync collection whose TanStack DB docs explicitly list React Native.
On-device SQLite, offline-first by default, offline write queue, conflict
resolution, and one shared data model across web and RN. Syncs with Postgres,
MongoDB, or MySQL.

```bash
npm install @tanstack/powersync-db-collection @powersync/react-native @powersync/op-sqlite @op-engineering/op-sqlite
```

Use `@powersync/react-native` in place of `@powersync/web`; the collection wiring
(`powerSyncCollectionOptions({ database, table })`) is identical to the web setup
in [collections.md](collections.md#powersync). PowerSync's own SDK docs cover the
RN database initialization and connector details.

### 2. The SQLite persistence layer (`persistedCollectionOptions`)

As of TanStack DB **0.6**, there's a first-party SQLite persistence layer that wraps
any synced collection with durable local storage — it persists both synced data
*and* pending mutations, so restarts are fast and offline edits survive. On RN it's
backed by `op-sqlite`:

```ts
import { open } from '@op-engineering/op-sqlite'
import { createCollection } from '@tanstack/db'
import {
  createReactNativeSQLitePersistence,
  persistedCollectionOptions,
} from '@tanstack/react-native-db-sqlite-persistence'

const database = open({ name: 'tanstack-db.sqlite', location: 'default' })
const persistence = createReactNativeSQLitePersistence({ database })

// Wrap a collection's options with persistedCollectionOptions({ persistence, ... })
```

> This layer is newer and its exact package/API names are evolving with the 0.x
> releases — verify against the current docs before relying on precise signatures.

### 3. RxDB — flexible, RN-capable

RxDB supports React Native through its own SQLite storage adapters (Expo SQLite,
`react-native-quick-sqlite`, or op-sqlite via JSI). Choose it when you want RxDB's
replication targets (Supabase, GraphQL, CouchDB, P2P) or want to control the
storage engine. In RN, set `multiInstance: false` (a single JS process, no
cross-tab coordination) and pick an RN SQLite `RxStorage`:

```ts
const db = await createRxDatabase({
  name: 'todosdb',
  storage: getRxStorageSQLiteTrial({
    sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync), // Expo SDK 51+
  }),
  multiInstance: false, // single JS process in React Native
})
```

> `getRxStorageSQLiteTrial()` is for evaluation only — capped at 500 documents with
> no indexing. Production needs RxDB's premium SQLite (or the Expo filesystem)
> storage. Follow RxDB's own RN guide for adapter setup.

## Not working

- **`localStorageCollection` does not work out of the box.** Its default backend is
  `window.localStorage`, which doesn't exist in RN. It accepts a custom `storage`
  adapter, but that adapter must be **synchronous** (`getItem`/`setItem`/
  `removeItem` return values directly). `react-native-mmkv` is synchronous and
  could shim it; `AsyncStorage` is asynchronous and **cannot**. Even then, this
  path is undocumented for RN and is meant for small UI state, not your primary
  data. For real persistence, use one of the SQLite options above.

- **AsyncStorage and MMKV are not documented TanStack DB backends.** The official
  direction for RN durability is SQLite. Don't reach for AsyncStorage as your
  collection store.

- **In-memory collections (`localOnlyCollectionOptions`) work** but are not durable
  — perfect for ephemeral UI state, useless for data that must survive a restart.

## Native modules

The SQLite options (`op-sqlite`, `expo-sqlite`, `react-native-quick-sqlite`) are
**native modules**. Practical consequences:

- They **do not run in Expo Go.** You need a development build / custom dev client
  (`expo prebuild` + `expo run:ios` / `expo run:android`), or a bare RN app with the
  native module linked.
- Expect native linking / config-plugin steps per each package's install docs.
- Plan this early — "it works in Expo Go" and "it works in a dev build" are
  different environments, and the SQLite path only exists in the latter.

## Minimal setup

Putting it together for an Expo/RN app with PowerSync:

```ts
// index.js — entry point, first line
import 'react-native-random-uuid'
import { registerRootComponent } from 'expo'
import App from './App'
registerRootComponent(App)
```

```ts
// db.ts
import { PowerSyncDatabase } from '@powersync/react-native'
import { createCollection } from '@tanstack/react-db'
import { powerSyncCollectionOptions } from '@tanstack/powersync-db-collection'
import { APP_SCHEMA, Connector } from './powersync-config'

const db = new PowerSyncDatabase({ database: { dbFilename: 'app.sqlite' }, schema: APP_SCHEMA })
db.connect(new Connector())

export const todosCollection = createCollection(
  powerSyncCollectionOptions({ database: db, table: APP_SCHEMA.props.todos }),
)
```

```tsx
// TodoScreen.tsx — identical to web from here on
import { useLiveQuery, eq } from '@tanstack/react-db'
import { View, Text, FlatList, Pressable } from 'react-native'
import { todosCollection } from './db'

export function TodoScreen() {
  const { data: todos } = useLiveQuery({
    query: (q) =>
      q.from({ todo: todosCollection }).where(({ todo }) => eq(todo.completed, false)),
  })

  return (
    <FlatList
      data={todos}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => todosCollection.update(item.id, (d) => { d.completed = true })}>
          <Text>{item.text}</Text>
        </Pressable>
      )}
    />
  )
}
```

From the component's perspective there is nothing RN-specific — the live query and
the optimistic update are exactly what you'd write on the web. The mobile-specific
work is all in the setup: the UUID polyfill, a persisting collection, and a native
build that can load SQLite.

## The internals, briefly

Live queries are powered by **differential dataflow** (the `d2ts` engine from
ElectricSQL, with a minimal in-memory variant shipped for the client). Instead of
re-running a query when data changes, only the *delta* flows through the operator
graph, so a one-row change in a sorted 100k-item collection updates in ~0.7ms.
Practically, this is why you can put live queries in RN list screens without
worrying about re-render cost — a component re-renders only when *its* query result
actually changes, and the recomputation is incremental rather than full.
