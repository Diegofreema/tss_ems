# Mutations — optimistic writes, actions, and transactions

Writes in TanStack DB are optimistic by default. The moment you call `insert`,
`update`, or `delete`, the change is applied as a **local overlay** on top of the
immutable synced data, so every live query reading that collection updates
instantly. A handler then persists the change to your backend. When the server's
version syncs back, the overlay is dropped in favour of the real row. If the
handler throws, the overlay is rolled back. There is **no automatic retry**.

Understanding that overlay-then-reconcile flow is the whole game. Everything below
is a variation on it.

## Contents
- [The lifecycle](#lifecycle)
- [insert / update / delete](#crud)
- [The handler contract](#handlers)
- [createOptimisticAction — intent-based, multi-collection](#optimistic-action)
- [createTransaction — manual batching and multi-step flows](#transactions)
- [Non-optimistic (awaited) writes](#non-optimistic)
- [Paced mutations — debounce, throttle, queue](#paced)
- [Temporary IDs and stable React keys](#temp-ids)
- [Error handling and retries](#errors)
- [Mutation merging](#merging)

Write primitives import from `@tanstack/react-db` (React) or `@tanstack/db`
(standalone).

## Lifecycle

A write returns a `Transaction` object whose `state` moves through:

`pending` → `persisting` → `completed` (or `failed`)

- **pending** — the optimistic overlay is applied; the handler hasn't resolved yet.
- **persisting** — the handler is running (talking to your backend).
- **completed** — persisted and the server change has synced back; overlay dropped.
- **failed** — the handler threw; the overlay was rolled back automatically.

You can await or inspect this:

```ts
const tx = todoCollection.update(todoId, (draft) => { draft.completed = true })
console.log(tx.state) // 'pending'
try {
  await tx.isPersisted.promise
  // success — server change has synced back
} catch (error) {
  // failed — overlay already rolled back
}
```

> The collection keeps optimistic state *separate* from synced data. Live queries
> read a merged view (overlay on top of synced). The overlay is held until the
> handler resolves; then the data is persisted and synced back and the overlay
> dissolves. Rows are matched by `getKey`, which is why a stable key matters.

## CRUD

### insert

```ts
todoCollection.insert({ id: '1', text: 'Buy groceries', completed: false })
todoCollection.insert([{ /* … */ }, { /* … */ }])                 // many
todoCollection.insert(item, { metadata: { source: 'import' } })   // with metadata
todoCollection.insert(item, { optimistic: false })                // await server first
```

### update — Immer-style draft

```ts
todoCollection.update(todo.id, (draft) => { draft.completed = true })
todoCollection.update([id1, id2], (drafts) => { drafts.forEach((d) => (d.completed = true)) })

// Options go BEFORE the mutator function:
todoCollection.update(todo.id, { metadata: { reason: 'user' } }, (draft) => { draft.text = 'x' })
todoCollection.update(todo.id, { optimistic: false }, (draft) => { draft.status = 'validated' })
```

> **Two things that bite people:** the options object is the *second* argument,
> before the mutator. And you mutate the draft's *properties* — never reassign the
> draft itself (`draft.done = true` ✅, `draft = { …todo, done: true }` ❌).

### delete

```ts
todoCollection.delete(todo.id)
todoCollection.delete([id1, id2])
todoCollection.delete(todo.id, { metadata: { reason: 'completed' } })
todoCollection.delete(todo.id, { optimistic: false })
```

## Handlers

Define `onInsert` / `onUpdate` / `onDelete` on the collection. Each receives
`{ transaction, collection }`. `transaction.mutations` is an array (batched writes
produce more than one) where each mutation carries:

| Field | Present for | Meaning |
|---|---|---|
| `type` | all | `'insert' \| 'update' \| 'delete'` |
| `key` | all | the item's key |
| `modified` | insert, update | the full new item |
| `original` | update, delete | the item before the change |
| `changes` | update | just the changed fields (a delta) |
| `metadata` | all | any metadata you attached |

```ts
const todoCollection = createCollection(
  queryCollectionOptions({
    // …
    onInsert: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.create(m.modified)))
    },
    onUpdate: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.update(m.original.id, m.changes)))
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((m) => api.todos.delete(m.original.id)))
    },
  }),
)
```

**The one rule that matters most:** a handler must **not resolve until the server
change has synced back** into the collection. If it resolves early, the overlay is
dropped before the real row arrives and the UI flickers. How you satisfy this
depends on the collection:

- **Query collection** — the automatic post-handler refetch handles it; just
  `await` your API call and let it refetch.
- **Electric collection** — return `{ txid }` (or `await collection.utils.awaitTxId(txid)`)
  so the drop waits for the change to appear in the replication stream.

> **Never call `collection.preload()`, a live-query `preload()`, or `loadSubset()`
> inside a handler — it deadlocks.**

## Optimistic action

`createOptimisticAction` bundles the optimistic update and the persistence into one
reusable action. Reach for it when a single user intent touches **multiple
collections**, or when the server decides the real outcome and you want to guess
optimistically then reconcile. It has two parts: `onMutate` (apply optimistic
changes synchronously) and `mutationFn` (persist; receives the payload and a
`params` with `.transaction` and `.signal`).

```tsx
import { createOptimisticAction } from '@tanstack/react-db'

const likePost = createOptimisticAction<string>({
  onMutate: (postId) => {
    postCollection.update(postId, (draft) => { draft.likeCount += 1; draft.likedByMe = true })
  },
  mutationFn: async (postId, params) => {
    await api.posts.like(postId, { signal: params.signal })
    await postCollection.utils.refetch() // server determines the real count
  },
})

likePost(postId)
```

Multi-collection intent — create a project and bump the owner's count together:

```tsx
const createProject = createOptimisticAction<{ name: string; ownerId: string }>({
  onMutate: ({ name, ownerId }) => {
    projectCollection.insert({ id: crypto.randomUUID(), name, ownerId, createdAt: new Date() })
    userCollection.update(ownerId, (draft) => { draft.projectCount += 1 })
  },
  mutationFn: async ({ name, ownerId }) => {
    const res = await api.projects.create({ name, ownerId })
    await Promise.all([projectCollection.utils.refetch(), userCollection.utils.refetch()])
    return res
  },
})
```

Validate the payload with a schema inside both callbacks if you want the action to
be the validation boundary (`addTodoSchema.parse(params)` in `onMutate` and
`mutationFn`).

> There is **no `useOptimisticMutation` hook**. The React optimistic primitive is
> `createOptimisticAction`; the paced React hook is `usePacedMutations`.

## Transactions

`createTransaction` lets you group several writes and commit them together — for
multi-step flows, previews before commit, or writing across collections atomically.

```ts
import { createTransaction } from '@tanstack/react-db'

const tx = createTransaction({
  autoCommit: false, // default is true
  mutationFn: async ({ transaction }) => {
    await Promise.all(transaction.mutations.map((m) => api.saveTodo(m.modified)))
  },
})

tx.mutate(() => todoCollection.insert({ id: '1', text: 'First', completed: false }))
tx.mutate(() => todoCollection.insert({ id: '2', text: 'Second', completed: false }))

await tx.commit()   // persist all at once
// tx.rollback()    // …or discard everything
```

Config: `{ id?, autoCommit = true, mutationFn, metadata? }`. Methods: `mutate(fn)`,
`commit()`, `rollback()`. Lifecycle: `tx.state` and `tx.isPersisted.promise` as
above.

**Crossing a local + server collection in one transaction:** persist the server
part in `mutationFn`, then call the local collection's
`utils.acceptMutations(transaction)` to confirm its optimistic rows (local-only and
local-storage collections don't have a server to sync back from, so you accept
their mutations manually):

```ts
const tx = createTransaction({
  autoCommit: false,
  mutationFn: async ({ transaction }) => {
    await Promise.all(
      transaction.mutations.filter((m) => m.collection === serverCollection).map((m) => api.items.create(m.modified)),
    )
    localDraft.utils.acceptMutations(transaction)
  },
})
tx.mutate(() => {
  localDraft.insert({ id: 'draft-1', data: '…' })
  serverCollection.insert({ id: '1', name: 'Item' })
})
await tx.commit()
```

## Non-optimistic

Pass `{ optimistic: false }` when you must wait for the server before touching
local state — irreversible actions, server-generated data, or anything where a
wrong optimistic guess would be worse than a brief wait:

```ts
const handleCreatePost = async (postData) => {
  const tx = postsCollection.insert(postData, { optimistic: false })
  try {
    await tx.isPersisted.promise
    navigate(`/posts/${postData.id}`)
  } catch (error) {
    toast.error('Failed to create post: ' + error.message)
  }
}

// update — remember options before the mutator:
const tx = todoCollection.update(id, { optimistic: false }, (draft) => Object.assign(draft, changes))
```

## Paced

`usePacedMutations` rate-limits writes with a strategy — for autosave, sliders,
and upload queues. It has the same `onMutate` + `mutationFn` shape as
`createOptimisticAction`, plus a `strategy`.

```tsx
import { usePacedMutations, debounceStrategy } from '@tanstack/react-db'

function AutoSaveForm({ formId }: { formId: string }) {
  const mutate = usePacedMutations<{ field: string; value: string }>({
    onMutate: ({ field, value }) => formCollection.update(formId, (d) => { d[field] = value }),
    mutationFn: async ({ transaction }) => { await api.forms.save(transaction.mutations) },
    strategy: debounceStrategy({ wait: 500 }),
  })
  return <input onChange={(e) => mutate({ field: 'title', value: e.target.value })} />
}
```

Strategies: `debounceStrategy({ wait })`, `throttleStrategy({ wait, leading,
trailing })`, `queueStrategy({ wait, addItemsTo, getItemsFrom })`.

Each `usePacedMutations` call has its *own* queue. To **share** a queue across
components, create one standalone `createPacedMutations` instance (from
`@tanstack/db`) and import it everywhere:

```ts
import { createPacedMutations, debounceStrategy } from '@tanstack/db'

export const mutateDraft = createPacedMutations<{ draftId: string; text: string }>({
  onMutate: ({ draftId, text }) => draftCollection.update(draftId, (d) => { d.text = text }),
  mutationFn: async ({ transaction }) => { await api.saveDraft(transaction.mutations) },
  strategy: debounceStrategy({ wait: 500 }),
})
```

## Temp IDs

Optimistic overlays match confirmed rows by `getKey`. The cleanest way to avoid a
key mismatch is to **generate the id on the client** so the key you insert with is
the key the server keeps:

```ts
todoCollection.insert({ id: crypto.randomUUID(), text: 'New', completed: false })
```

If the server *must* assign the id, the optimistic row starts with a temp id and
gets a different real id on sync — which makes React keys jump and remounts the
row. Keep a **stable view key** that survives the transition:

```tsx
const idToViewKey = new Map<number | string, string>()
const getViewKey = (id) => { if (!idToViewKey.has(id)) idToViewKey.set(id, crypto.randomUUID()); return idToViewKey.get(id)! }
const linkIds = (tempId, realId) => idToViewKey.set(realId, getViewKey(tempId))

const todoCollection = createCollection({
  // …
  onInsert: async ({ transaction }) => {
    const m = transaction.mutations[0]
    const res = await api.todos.create({ text: m.modified.text, completed: m.modified.completed })
    linkIds(m.modified.id, res.id)  // temp → real
    await todoCollection.utils.refetch()
  },
})

// In the list, key on the view key, not the id:
{todos.map((todo) => <li key={getViewKey(todo.id)}>{todo.text}</li>)}
```

You can also await the real id for navigation-style flows:
`const tx = collection.insert(item); await tx.isPersisted.promise; // now the synced row has the real id`.

## Errors

Rollback on a thrown handler is automatic — you don't clean up the overlay
yourself. What you *do* own is retry (there is none built in) and user feedback.
Wrap retryable work inside the handler / `mutationFn`:

```ts
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await fn() }
    catch (e) { if (attempt === maxRetries - 1) throw e; await new Promise((r) => setTimeout(r, delay * (attempt + 1))) }
  }
  throw new Error('Unreachable')
}

onUpdate: async ({ transaction }) => {
  const m = transaction.mutations[0]
  await withRetry(() => api.todos.update(m.original.id, m.changes))
}
```

For user-facing errors, either `await tx.isPersisted.promise` in a try/catch at the
call site, or surface an error toast from the `mutationFn`.

## Merging

If the same item is mutated more than once within one transaction, the mutations
merge before the handler runs:

| First + then | Result |
|---|---|
| insert + update | `insert` (with the update applied) |
| insert + delete | *removed* (nothing persisted) |
| update + delete | `delete` |
| update + update | `update` (merged) |

This means a handler never sees a redundant insert-then-delete — it's already been
collapsed away.
