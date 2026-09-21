// Purpose: Compile representative public API usage without producing build output.
import { scan, watch, type Policy } from '../src/index.mjs';
import { createJevEvaluator } from '../src/jev.mjs';
const policy: Policy = { id: 'risk', condition: 'Blocked', model: 'jev-1.13.0', onThreshold: .8, offThreshold: .2 };
const evaluator = createJevEvaluator();
const checkpoint = await scan([{ id: 'one', text: 'Blocked' }], policy, { evaluator });
for await (const next of watch(async () => [], policy, { evaluator, previous: checkpoint })) void next;
