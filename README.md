# Semantic Watch

Watch a condition over changing text, evaluate only changed items, and emit transitions with hysteresis.

[![Tests](https://github.com/gbesse/semantic-watch/actions/workflows/test.yml/badge.svg)](https://github.com/gbesse/semantic-watch/actions/workflows/test.yml)

**Alpha · MIT · Node.js 22+ · no build required.** Sources and evaluators are plugin contracts. This release includes local JSON-file polling and an optional pinned Jev condition evaluator. It does not include email, Slack or hosted scheduling.

## Try it

```sh
git clone https://github.com/gbesse/semantic-watch.git
cd semantic-watch
npm ci --ignore-scripts
npm run demo
node bin/semantic-watch.mjs scan examples/items.json examples/policy.json /tmp/semantic-snapshot.json --evaluator examples/demo-evaluator.mjs
node bin/semantic-watch.mjs watch examples/items.json examples/policy.json /tmp/semantic-history --iterations 3 --interval 1000 --evaluator examples/demo-evaluator.mjs
```

The fixture converts numeric strings to synthetic probabilities. It demonstrates caching and state transitions, not language understanding. Output paths must be new; watch writes numbered private snapshots to a new directory. Polling defaults to one iteration and is bounded by an explicit count. Ctrl-C stops with an error; completed snapshots remain available.

Install with `npm install github:gbesse/semantic-watch#v0.1.0`.

## State transitions

Items are `{ id, text }`. A policy contains an id, condition, pinned model, `onThreshold` and `offThreshold`. Require `0 <= offThreshold < onThreshold <= 1`.

With thresholds 0.8 and 0.2:

| Probability | Prior state | New state |
| --- | --- | --- |
| 0.9 | unknown/false | true |
| 0.6 | true | true, uncertain |
| 0.6 | unknown | unknown, uncertain |
| 0.1 | true/unknown | false |

A missing item emits `removed`. An unchanged item and policy reuse the previous result. A different policy fingerprint rejects a previous checkpoint; start fresh intentionally. Bump the policy id when changing a custom evaluator's behavior. This is an exact-input cache, not a semantic-similarity cache or a guarantee that a hosted model is immutable.

## API and Jev

```js
import { scan } from '@gbesse/semantic-watch';
import { createJevEvaluator } from '@gbesse/semantic-watch/jev';
const next = await scan(items, policy, {
  evaluator: createJevEvaluator(), previous, maxItems: 1000,
});
```

Set `TYPESAFE_API_KEY` and replace `--evaluator …` with `--jev` for actual text evaluation. Changed item text is sent to Typesafe. A pinned `jev-1.13.0` noul question returns the condition probability. Errors abort the scan without mutating the prior checkpoint. Review [source/evaluator contracts](docs/plugins.md) for custom integrations.

`watch(source, policy, options)` is an async generator. Sources and evaluators have explicit deadlines and receive an AbortSignal. Snapshots are local data, not authenticated attestations. There is no distributed coordination, notification deduplication or exactly-once delivery.

## Development

Run `npm run typecheck`, `npm run check`, `npm test` and `npm run demo`. Tests cover hysteresis, deletion, cache invalidation, source deadlines, atomic checkpoint behavior, CLI artifacts and loopback HTTP. Live Jev quality has not been measured. See [SECURITY.md](SECURITY.md).

## Where this can grow

Reusable condition packs, connectors and annotated transition histories are the potential ecosystem asset. Useful first contributions are source adapters with reliable item ids and small, licensed examples of transitions that people actually care about.
