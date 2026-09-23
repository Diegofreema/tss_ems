# Live queries — the full query builder

Live queries are the read side of TanStack DB. They look like SQL, they are fully
reactive by default (they update themselves when the underlying data changes), and
they recompute incrementally rather than from scratch — a single changed row flows
through the query as a delta, which is why complex joins and aggregations stay
sub-millisecond.

You compose a query by chaining methods on the query builder `q`. Each method
returns a new builder, so order matters and nothing executes until the query is
run by a collection or a hook.

## Contents
- [Two ways to create a live query](#two-ways-to-create-a-live-query)
- [Reading in React: useLiveQuery vs useLiveSuspenseQuery](#reading-in-react)
- [from — the source](#from)
- [where — filtering](#where)
- [Operators and functions](#operators-and-functions)
- [select — projection and computed fields](#select)
- [joins](#joins)
- [subqueries](#subqueries)
- [includes — nested/hierarchical results](#includes)
- [groupBy and aggregations](#groupby-and-aggregations)
- [distinct, findOne, orderBy/limit/offset](#distinct-findone-ordering)
- [Virtual properties](#virtual-properties)
- [Functional variants and queryKey](#functional-variants)
- [Composable and reusable queries](#composable-queries)
- [One-shot queries and reactive effects](#one-shot-and-effects)

All operators and functions (`eq`, `gt`, `and`, `count`, `upper`, …) import from
`@tanstack/react-db` (or `@tanstack/db`).

## Two ways to create a live query

Inside a React component you almost always use the `useLiveQuery` hook. Outside
components — or when you want a reusable, named query result that other queries
can read from — you create a **live query collection** (the result is itself a
collection):

```ts
import { createLiveQueryCollection, liveQueryCollectionOptions, createCollection, eq } from '@tanstack/db'

// Convenience function
const activeUsers = createLiveQueryCollection((q) =>
  q
    .from({ user: usersCollection })
    .where(({ user }) => eq(user.active, true))
    .select(({ user }) => ({ id: user.id, name: user.name })),
)

// Full options form (same thing, with config)
const activeUsers2 = createCollection(
  liveQueryCollectionOptions({
    id: 'active-users',        // optional, for debugging
    query: (q) => q.from({ user: usersCollection }).where(({ user }) => eq(user.active, true)),
    getKey: (row) => row.id,   // optional custom key extraction
    // schema, startSync (default true), gcTime (default 5000ms) also available
  }),
)
```

A live query collection is the key to **composition**: because its result is a
collection, you can `from({ x: activeUsers })` in another query and the whole
chain stays incrementally reactive.

## Reading in React

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db'

function UserList() {
  const { data: activeUsers, status, isLoading, isReady, isError, collection } =
    useLiveQuery({
      query: (q) =>
        q.from({ user: usersCollection }).where(({ user }) => eq(user.active, true)),
    })

  if (isLoading) return <Spinner />
  return <ul>{activeUsers.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}
```

The hook returns:

| Field | Meaning |
|---|---|
| `data` | `Array<T>` (or `undefined` before ready / when disabled) |
| `status` | `'idle' \| 'loading' \| 'error' \| 'success' \| 'disabled'` |
| `isLoading` / `isReady` / `isError` / `isIdle` | Boolean status flags |
| `isEnabled` / `isCleanedUp` | Whether the query is active |
| `collection` | The underlying live-query collection |

**`useLiveSuspenseQuery`** is the Suspense-friendly variant. Its `data` is *always*
a defined array — the component suspends during initial load, so by the time it
renders the data is guaranteed present:

```tsx
import { useLiveSuspenseQuery } from '@tanstack/react-db'
import { Suspense } from 'react'

function UserList() {
  const { data } = useLiveSuspenseQuery({
    query: (q) =>
      q.from({ user: usersCollection }).where(({ user }) => eq(user.active, true)),
  })
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
}

function App() {
  return (
    <Suspense fallback={<div>Loading users…</div>}>
      <UserList />
    </Suspense>
  )
}
```

**Which to use:** reach for `useLiveSuspenseQuery` when you want `<Suspense>` /
`<ErrorBoundary>` to own loading and error UI, guaranteed non-undefined data, and
the query always runs. Use `useLiveQuery` when the query is conditional on optional
inputs, when you want inline loading/error handling via the status flags, or when
you're driving loads from a router.

**Conditional / disabled queries:** return `undefined` (or `null`) from the query
callback to disable the query. Its `status` becomes `'disabled'`, `isEnabled` is
`false`, and `data` is `undefined`. This is how you gate a query on a missing
input without breaking the rules of hooks:

```tsx
function TodoList({ userId }: { userId?: string }) {
  const { data } = useLiveQuery({
    query: (q) =>
      userId
        ? q.from({ todo: todosCollection }).where(({ todo }) => eq(todo.userId, userId))
        : undefined,
  })
  if (!userId) return <div>Please select a user</div>
  return <ul>{data?.map((t) => <li key={t.id}>{t.text}</li>)}</ul>
}
```

## from

Every query starts with `from`, naming a source collection with an alias. The
alias is what you destructure in every later clause.

```ts
q.from({ user: usersCollection })
```

**`unionAll`** combines rows from multiple sources into one stream — useful for
timelines built from heterogeneous collections:

```ts
const timeline = createLiveQueryCollection((q) =>
  q
    .unionAll({ message: messagesCollection, toolCall: toolCallsCollection })
    .orderBy(({ message, toolCall }) => coalesce(message.timestamp, toolCall.timestamp)),
)
```

## where

`where` takes a callback that receives your aliases and returns a boolean
*expression* (not an executed function). Chain multiple `where` calls to AND them:

```ts
q
  .from({ user: usersCollection })
  .where(({ user }) => eq(user.active, true))
  .where(({ user }) => gt(user.age, 18)) // AND
```

Combine conditions explicitly with `and` / `or` / `not`:

```ts
q.from({ user: usersCollection }).where(({ user }) =>
  and(eq(user.active, true), or(gt(user.age, 25), eq(user.role, 'admin'))),
)
```

> **Three-valued logic:** comparisons follow SQL/PostgreSQL, not JavaScript. Any
> comparison involving `null` or `undefined` evaluates to UNKNOWN, and the row is
> **not** matched. Don't expect `eq(x, null)` to find nulls.

## Operators and functions

All import from `@tanstack/react-db` / `@tanstack/db`.

**Comparison / logical:** `eq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`,
`inArray`, `and`, `or`, `not`.

**String:** `upper(v)`, `lower(v)`, `length(v)` (string or array length),
`concat(...values)`.

**Math:** `add`, `subtract`, `multiply`, `divide` (returns null on divide-by-zero).

**Utility:** `coalesce(...values)` (first non-null), `caseWhen(condition, value, …)`.

**Aggregates (with `groupBy`):** `count(v)`, `sum(v)`, `avg(v)`, `min(v)`, `max(v)`.

## select

Use `select` to choose fields and compute new ones. Without `select` you get the
full row shape.

```ts
// Pick fields
q.from({ user: usersCollection }).select(({ user }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
}))

// Computed fields
q.from({ user: usersCollection }).select(({ user }) => ({
  id: user.id,
  isAdult: gt(user.age, 18),
  nameLength: length(user.name),
}))

// Spread all fields, add some
q.from({ user: usersCollection }).select(({ user }) => ({
  ...user,
  displayName: upper(concat(user.firstName, ' ', user.lastName)),
  isAdult: gt(user.age, 18),
}))
```

## joins

Joins combine collections just like SQL. Supported types: `left` (default),
`right`, `inner`, `full`. Pass the type as a third argument, or use the aliases
`leftJoin` / `rightJoin` / `innerJoin` / `fullJoin`.

```ts
// Basic join
q.from({ user: usersCollection })
 .join({ post: postsCollection }, ({ user, post }) => eq(user.id, post.userId))

// Inner join
q.from({ user: usersCollection })
 .join({ post: postsCollection }, ({ user, post }) => eq(user.id, post.userId), 'inner')

// Multiple joins + projection
q.from({ user: usersCollection })
 .join({ post: postsCollection }, ({ user, post }) => eq(user.id, post.userId))
 .join({ comment: commentsCollection }, ({ post, comment }) => eq(post.id, comment.postId))
 .select(({ user, post, comment }) => ({
   userName: user.name,
   postTitle: post.title,
   commentText: comment.text,
 }))
```

## subqueries

A subquery is a query used as the source of another. Build it and pass it where a
collection would go — in `from` or in a `join`. Identical subqueries are
deduplicated and executed once.

```ts
const activeUserPosts = createCollection(
  liveQueryCollectionOptions({
    query: (q) => {
      const activeUsers = q
        .from({ user: usersCollection })
        .where(({ user }) => eq(user.active, true))

      return q
        .from({ activeUser: activeUsers })
        .join({ post: postsCollection }, ({ activeUser, post }) => eq(activeUser.id, post.userId))
    },
  }),
)
```

## includes

Includes produce **nested, hierarchical** results instead of flattening a join.
Nest a subquery inside `select` and each parent row gets a child field that is
*itself a live collection*.

```ts
const projectsWithIssues = createLiveQueryCollection((q) =>
  q.from({ p: projectsCollection }).select(({ p }) => ({
    id: p.id,
    name: p.name,
    issues: q
      .from({ i: issuesCollection })
      .where(({ i }) => eq(i.projectId, p.id)) // correlation condition — REQUIRED
      .select(({ i }) => ({ id: i.id, title: i.title })),
  })),
)
```

The child query **must** contain a correlation condition — an equality linking
child to parent (standalone `.where()` or inside an `and()`).

Use `materialize()` with `findOne()` when the nested relationship is single-valued:

```ts
const issuesWithProject = createLiveQueryCollection((q) =>
  q.from({ i: issuesCollection }).select(({ i }) => ({
    ...i,
    project: materialize(
      q.from({ p: projectsCollection }).where(({ p }) => eq(p.id, i.projectId)).findOne(),
    ),
  })),
)
```

> **React gotcha with includes:** you must pass the child collection to a
> subcomponent and subscribe to it there with `useLiveQuery`. Reading
> `project.issues` directly in the parent gives you the collection object but the
> parent won't re-render when the child data changes.

```tsx
function ProjectList() {
  const { data: projects } = useLiveQuery({
    query: (q) =>
      q.from({ p: projectsCollection }).select(({ p }) => ({
        id: p.id,
        name: p.name,
        issues: q.from({ i: issuesCollection })
          .where(({ i }) => eq(i.projectId, p.id))
          .select(({ i }) => ({ id: i.id, title: i.title })),
      })),
  })
  return (
    <ul>
      {projects.map((project) => (
        <li key={project.id}>{project.name}<IssueList issuesCollection={project.issues} /></li>
      ))}
    </ul>
  )
}

function IssueList({ issuesCollection }) {
  const { data: issues } = useLiveQuery(issuesCollection) // subscribe to the child
  return <ul>{issues.map((issue) => <li key={issue.id}>{issue.title}</li>)}</ul>
}
```

## groupBy and aggregations

```ts
q.from({ user: usersCollection })
 .groupBy(({ user }) => user.departmentId)
 .select(({ user }) => ({
   departmentId: user.departmentId,
   userCount: count(user.id),
   avgAge: avg(user.age),
 }))
```

Group by multiple columns with an array. Filter *after* aggregation with `having`,
which reads the aggregated result via `$selected`:

```ts
q.from({ order: ordersCollection })
 .groupBy(({ order }) => order.customerId)
 .select(({ order }) => ({
   customerId: order.customerId,
   totalSpent: sum(order.amount),
   orderCount: count(order.id),
 }))
 .having(({ $selected }) => gt($selected.totalSpent, 1000))
```

> In a `groupBy` query, every property in `select` must be either an aggregate
> function or a column that appears in the `groupBy`.

## distinct, findOne, ordering

```ts
// distinct — requires a select clause
q.from({ user: usersCollection }).select(({ user }) => ({ country: user.country })).distinct()

// findOne — returns a single row (T | undefined) instead of an array
q.from({ users: usersCollection }).where(({ users }) => eq(users.id, 1)).findOne()

// ordering, paging; chain orderBy for multi-key sorts
q.from({ user: usersCollection })
 .orderBy(({ user }) => user.departmentId, 'asc')
 .orderBy(({ user }) => user.name, 'asc')
 .limit(20)
 .offset(20)

// order by a selected/aggregated field
q.from({ order: ordersCollection })
 .groupBy(({ order }) => order.customerId)
 .select(({ order }) => ({ customerId: order.customerId, totalSpent: sum(order.amount) }))
 .orderBy(({ $selected }) => $selected.totalSpent, 'desc')
 .limit(10)
```

## Virtual properties

Every result row carries read-only computed properties you can use in `where`,
`select`, and `orderBy`:

- `$synced` — has this row been confirmed by sync?
- `$origin` — `'local'` or `'remote'`, the source of the last change
- `$key` — the row's key
- `$collectionId` — the source collection's id

These let you, for example, sort unconfirmed optimistic rows to the top or style
them differently while they persist.

## Functional variants

`.fn.select`, `.fn.where`, and `.fn.having` run arbitrary JavaScript per row
instead of building a declarative expression. They're an escape hatch for logic
the operators can't express.

```ts
q.from({ user: usersCollection }).fn.where((row) => {
  const u = row.user
  return u.active && (u.age > 25 || u.role === 'admin') && u.email.includes('@company.com')
})
```

> **Cost:** functional variants **cannot be optimized by the query optimizer and
> cannot use indexes**, and `fn.select` cannot be combined with `groupBy`. Use
> them sparingly. Because their logic is opaque, the engine can't derive the
> query's identity — pass an explicit `queryKey` so React knows when to recompute:

```tsx
function UserSearch({ search }: { search: string }) {
  const { data } = useLiveQuery({
    queryKey: [usersCollection.id, 'search', search],
    query: (q) =>
      q.from({ user: usersCollection })
       .fn.where(({ user }) => user.name.toLowerCase().includes(search.toLowerCase())),
  })
  return <div>{data.length} users</div>
}
```

(For ordinary declarative queries you do **not** need `queryKey` — identity is
derived from the query structure automatically. Old-style dependency arrays still
work but warn in dev and are going away in 1.0.)

## Composable queries

**Reusable query definitions** with the `Query` builder:

```ts
import { Query, eq } from '@tanstack/db'

const userQuery = new Query().from({ user: usersCollection }).where(({ user }) => eq(user.active, true))
const activeUsers = createLiveQueryCollection({
  query: userQuery.select(({ user }) => ({ id: user.id, name: user.name })),
})
```

**Reusable predicates** with `Ref<T>`:

```ts
import type { Ref } from '@tanstack/db'
import { eq, gt } from '@tanstack/db'

const isActive = ({ user }: { user: Ref<User> }) => eq(user.active, true)
const isAdult = ({ user }: { user: Ref<User> }) => gt(user.age, 18)

const activeAdults = createLiveQueryCollection((q) =>
  q.from({ user: usersCollection }).where(isActive).where(isAdult),
)
```

**Caching intermediate results:** a live query collection can be the source of
another, and TanStack DB keeps the intermediate incrementally maintained — so
shared sub-results are computed once and reused.

## One-shot and effects

**`queryOnce`** gives a non-reactive snapshot: it builds the query, preloads,
extracts the results, and cleans up. Good for scripts, background tasks, exports,
or building LLM context — anywhere you want the data *now* and no subscription.

```ts
const activeUsers = await queryOnce((q) =>
  q.from({ user: usersCollection }).where(({ user }) => eq(user.active, true))
   .select(({ user }) => ({ id: user.id, name: user.name })),
)
```

**`createEffect`** reacts to result *changes* without materializing the whole set
— it fires callbacks as rows enter, update, or exit a query result. This is how
you trigger side effects (notifications, generating a response, syncing to another
system) from data changes.

```ts
import { createEffect, eq } from '@tanstack/db'

const effect = createEffect({
  query: (q) => q.from({ msg: messagesCollection }).where(({ msg }) => eq(msg.role, 'user')),
  skipInitial: true, // don't fire for rows already present at start
  onEnter: async (event) => { await generateResponse(event.value) },
  onUpdate: (event) => { /* event.value, event.previousValue */ },
  onExit: (event) => { /* row left the result */ },
  onError: (error, event) => { /* handler threw */ },
})

await effect.dispose()
```

In React, use the hook form:

```tsx
import { useLiveQueryEffect } from '@tanstack/react-db'

function Chat({ channelId }: { channelId: string }) {
  useLiveQueryEffect(
    {
      query: (q) => q.from({ msg: messagesCollection }).where(({ msg }) => eq(msg.channelId, channelId)),
      skipInitial: true,
      onEnter: async () => { await playNotificationSound() },
    },
    [channelId],
  )
  return <div>…</div>
}
```
