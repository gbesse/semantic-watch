// Purpose: Demonstrate hysteresis and exact caching using explicitly synthetic probabilities.
import { scan } from '../src/index.mjs';
import { evaluate as evaluator } from './demo-evaluator.mjs';
import { readFile } from 'node:fs/promises';
const policy = JSON.parse(await readFile(new URL('./policy.json', import.meta.url), 'utf8')); let previous;
for (const text of ['0.1', '0.95', '0.65', '0.65', '0.15']) {
  previous = await scan([{ id: 'release-note', text }], policy, { evaluator, previous });
  console.log(JSON.stringify({ fixture: true, text, transitions: previous.transitions, cached: previous.cached }));
}
