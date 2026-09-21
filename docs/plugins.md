# Plugin contracts

This document defines the version 0.1 extension interfaces and their trust boundaries.

## Evaluator

CLI: `--evaluator ./my-evaluator.mjs`. Export async `evaluate(item, policy, { signal })`, returning `{ probability }` in [0,1] and optionally a DecisionPacks `record`. API option name: `evaluator`.

Keep a stable evaluator implementation for a policy id. When its behavior changes, change the policy id and begin a fresh checkpoint; otherwise the exact-input cache can reuse old judgments. Do not use synthetic fixture evaluators for language understanding.

## Source

API: `watch(source, policy, { evaluator, iterations, intervalMs, previous, timeoutMs, signal })`. Source is async `({ signal }) => items`, returning unique `{ id, text }` rows. The built-in CLI source reloads a local JSON file. Connectors for databases, feeds and object stores are extension work, not bundled features.

Every successful scan yields a whole checkpoint plus transitions. The host deliberately has no notification side effects. Persist checkpoints and handle transitions in your application; design retries and deduplication there. Missing rows count as removal, so a connector must throw on incomplete fetches rather than return a partial list silently.

## Shared rules

Modules loaded by path are trusted executable code, not data or sandboxed extensions. All portable values must be finite acyclic JSON. Async hooks default to a 30-second deadline and receive an AbortSignal. Deadlines stop waiting; synchronous loops or effects that ignore cancellation cannot be forcibly stopped in-process. External requests need explicit network timeouts. Errors propagate to the caller; the embedding application owns administrator alerting and must not silently fabricate a successful result.

Provider injection uses `createJevProvider` from the pinned DecisionPacks dependency. Use loopback HTTP fixtures for integration tests. Do not commit provider keys, production records or personal data in contributed examples.
