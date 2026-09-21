#!/usr/bin/env node
// Purpose: Scan or poll a local item file, preserving every successful snapshot without overwrites.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { scan, watch } from '../src/index.mjs';
import { readJSON, writeJSON, loadPlugin, assertNewOutput } from '../src/cli-files.mjs';
async function main() {
  const [command, input, policyFile, output, ...flags] = process.argv.slice(2);
  if (!command || command === '--help') { console.log('semantic-watch scan|watch ITEMS.json POLICY.json OUTPUT [--jev | --evaluator PLUGIN.mjs] [--previous SNAPSHOT.json] [--iterations N] [--interval MS]\nwatch creates a new output directory; default one iteration. Evaluator modules export evaluate.'); return; }
  if (!['scan', 'watch'].includes(command) || !output) throw new Error('Expected scan|watch ITEMS POLICY OUTPUT');
  await assertNewOutput(output);
  const options = {}; let evaluator;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--jev' && !evaluator) evaluator = (await import('../src/jev.mjs')).createJevEvaluator();
    else if (flags[i] === '--evaluator' && flags[i + 1] && !evaluator) { evaluator = (await loadPlugin(flags[++i])).evaluate; if (typeof evaluator !== 'function') throw new Error('Plugin must export evaluate'); }
    else if (flags[i] === '--previous' && flags[i + 1]) options.previous = await readJSON(flags[++i]);
    else if (flags[i] === '--iterations' && flags[i + 1]) options.iterations = Number(flags[++i]);
    else if (flags[i] === '--interval' && flags[i + 1]) options.intervalMs = Number(flags[++i]);
    else throw new Error('Invalid flag');
  }
  if (!evaluator) throw new Error('Select --jev or --evaluator');
  const policy = await readJSON(policyFile);
  if (command === 'scan') { const result = await scan(await readJSON(input), policy, { ...options, evaluator }); await writeJSON(output, result); console.log(JSON.stringify(result.transitions)); }
  else {
    await mkdir(output, { mode: 0o700 }); let iteration = 0;
    const controller = new AbortController(), stop = () => controller.abort(new Error('Watch interrupted'));
    process.once('SIGINT', stop);
    try { for await (const result of watch(() => readJSON(input), policy, { ...options, evaluator, signal: controller.signal })) { await writeJSON(join(output, `scan-${String(++iteration).padStart(6, '0')}.json`), result); console.log(JSON.stringify({ iteration, transitions: result.transitions })); } }
    finally { process.removeListener('SIGINT', stop); }
  }
}
main().catch(error => { console.error(`semantic-watch: ${error.message}`); process.exitCode = 1; });
