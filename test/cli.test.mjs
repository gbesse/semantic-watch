// Purpose: Verify the public CLI produces parseable artifacts and refuses to overwrite them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('CLI writes a portable artifact, offers help and refuses overwrite', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'semantic-watch-test-')), output = join(folder, 'result.json');
  const invoke = args => spawnSync(process.execPath, ['bin/semantic-watch.mjs', ...args], { encoding: 'utf8', timeout: 10000 });
  try {
    assert.equal(invoke(['--help']).status, 0);
    const args = ['scan', 'examples/items.json', 'examples/policy.json', output, '--evaluator', 'examples/demo-evaluator.mjs'];
    const first = invoke(args); assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).schemaVersion, 1);
    const second = invoke(args); assert.equal(second.status, 1); assert.match(second.stderr, /EEXIST/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});
