# tanstack-db-local-first

A Claude skill for building fast, local-first applications with
[TanStack DB](https://tanstack.com/db/latest) in **React and React Native**.

TanStack DB is a reactive client store: you load data into normalized
**collections**, read it with sub-millisecond **live queries**, and change it with
instant **optimistic mutations**. This skill packages the mental model, the full
API surface, and the production patterns an agent needs to build real apps with it
— distilled from the official documentation.

## What's inside

| File | Covers |
|---|---|
| [`SKILL.md`](SKILL.md) | The mental model, install, the canonical loop, a collection-choice decision matrix, and the pitfalls that bite — plus the map of the reference files |
| [`references/collections.md`](references/collections.md) | Every collection type (query, local-only, local-storage, Electric, PowerSync, RxDB, TrailBase) with full options, plus writing a custom sync adapter |
| [`references/live-queries.md`](references/live-queries.md) | The complete query builder: operators, joins, subqueries, nested includes, aggregations, `useLiveQuery` vs `useLiveSuspenseQuery`, effects |
| [`references/mutations.md`](references/mutations.md) | Optimistic writes, the handler contract, `createOptimisticAction`, `createTransaction`, paced mutations, temp-ID handling |
| [`references/react-native.md`](references/react-native.md) | RN setup, the required UUID polyfill, SQLite persistence options, native-module caveats, and what doesn't work |
| [`references/enterprise-patterns.md`](references/enterprise-patterns.md) | Normalization, schema validation, error/rollback UX, SSR/hydration, lifecycle & memory, testing, performance, security |

## Installing the skill

The skill's name is **`tanstack-db`** (this repo is just its home).

**With the [`skills`](https://github.com/vercel-labs/skills) CLI (recommended):**

```bash
# into the current project (./.claude/skills/tanstack-db/)
npx skills add Diegofreema/tanstack-db-local-first -a claude-code

# or globally for every project (~/.claude/skills/tanstack-db/)
npx skills add Diegofreema/tanstack-db-local-first -a claude-code -g
```

**By cloning manually** — put it anywhere Claude Code loads skills from, in a
folder named `tanstack-db`:

```bash
# global (all projects)
git clone https://github.com/Diegofreema/tanstack-db-local-first \
  ~/.claude/skills/tanstack-db

# per project
git clone https://github.com/Diegofreema/tanstack-db-local-first \
  <your-project>/.claude/skills/tanstack-db
```

The skill triggers automatically when you're working with `@tanstack/react-db` /
`@tanstack/db`, or when you mention local-first, offline-first, optimistic UI, live
queries, or syncing a client store. You can also invoke it explicitly by name.

## A note on accuracy

This skill is built from the official TanStack DB docs. **TanStack DB is in beta
(0.x)** — the API is still moving (notably the transition between the module-level
`createCollection` style and the newer `DbClient`/`DbProvider` style, both of which
the skill documents). Pin your versions, and when a precise signature is
load-bearing, cross-check the current docs at
<https://tanstack.com/db/latest>.

## License

MIT
