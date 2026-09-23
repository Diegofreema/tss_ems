# Trigger evals

`trigger-eval.json` is a set of 20 realistic queries for tuning the skill's
`description` (the field that decides when Claude reaches for this skill):

- **10 should-trigger** — building/using TanStack DB in React or React Native
  (offline sync, optimistic writes, live queries, collections, custom adapters),
  including one phrased without naming the library ("make checkout feel instant").
- **10 should-NOT-trigger** — near-misses that share keywords but need a different
  tool: plain TanStack Query caching, react-query `useMutation` optimistic updates,
  Firestore/Supabase realtime, Drizzle + expo-sqlite, Redux persistence,
  Materialize/timely differential dataflow, MongoDB indexing, generic React
  re-render perf, backend schema design.

## Running the optimizer

This uses the **skill-creator** description optimizer, which runs each query
through `claude -p` several times and checks whether the skill triggers, then asks
a model to improve the description and re-tests — selecting the best version by the
held-out test score.

**Requirements:**
- **An authenticated `claude` CLI.** Run this from an interactive Claude Code
  session where you're logged in — a `claude -p` subprocess spawned from some
  sandboxed/embedded sessions returns *"organization does not have access"* and
  every eval silently fails (0% trigger rate that means nothing).
- **Python 3.10+** (the scripts use `X | None` type syntax; macOS's default
  `/usr/bin/python3` 3.9 will crash — use `python3.13` or similar).
- The skill-creator scripts on `PYTHONPATH`.

**Command template:**

```bash
PYTHONPATH="<path-to>/skill-creator" python3.13 -m scripts.run_loop \
  --eval-set ./evals/trigger-eval.json \
  --skill-path . \
  --model opus \
  --max-iterations 5 \
  --runs-per-query 3 \
  --holdout 0.4 \
  --verbose
```

The easiest way to get the paths right is to open an interactive `claude` session
and ask it to *"optimize the trigger description for this skill using
evals/trigger-eval.json"* — the skill-creator skill knows where its scripts live
and will run the loop, then update the `description` in `SKILL.md` with the
best-scoring version.
