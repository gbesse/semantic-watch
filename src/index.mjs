// Purpose: Detect transitions in semantic conditions with versioned caches and hysteresis.
import { fingerprint } from '@gbesse/decisionpacks';
import { setTimeout as delay } from 'node:timers/promises';
import { ensure, nonempty, snapshot, bounded } from './contracts.mjs';
export function validatePolicy(policy) {
  snapshot(policy);
  ensure(nonempty(policy?.id) && nonempty(policy.condition) && /^jev-\d+\.\d+\.\d+$/.test(policy.model), 'Policy requires id, condition and pinned Jev model');
  ensure(Number.isFinite(policy.offThreshold) && Number.isFinite(policy.onThreshold) && policy.offThreshold >= 0 && policy.offThreshold < policy.onThreshold && policy.onThreshold <= 1, 'Require 0 <= offThreshold < onThreshold <= 1');
  return policy;
}
export async function scan(items, policy, { evaluator, previous, timeoutMs = 30000, signal, maxItems = 1000 } = {}) {
  items = snapshot(items); policy = snapshot(validatePolicy(policy));
  ensure(typeof evaluator === 'function', 'An explicit evaluator is required');
  ensure(Number.isSafeInteger(maxItems) && maxItems > 0 && maxItems <= 10000 && Array.isArray(items) && items.length <= maxItems, 'Invalid item budget');
  ensure(items.every(i => nonempty(i.id) && typeof i.text === 'string') && new Set(items.map(i => i.id)).size === items.length, 'Items require unique ids and text');
  const policyFingerprint = fingerprint(policy), old = new Map();
  if (previous) {
    previous = snapshot(previous);
    ensure(previous.schemaVersion === 1 && previous.policyFingerprint === policyFingerprint && Array.isArray(previous.items), 'Previous state belongs to another policy/version');
    for (const entry of previous.items) {
      ensure(nonempty(entry.id) && !old.has(entry.id) && /^[a-f0-9]{64}$/.test(entry.inputFingerprint) && ['true', 'false', 'unknown'].includes(entry.state) && Number.isFinite(entry.probability) && entry.probability >= 0 && entry.probability <= 1, 'Invalid previous item');
      old.set(entry.id, entry);
    }
  }
  const next = [], transitions = []; let evaluated = 0, cached = 0;
  for (const item of items) {
    signal?.throwIfAborted();
    const prior = old.get(item.id), inputFingerprint = fingerprint(item);
    if (prior?.inputFingerprint === inputFingerprint) { next.push(snapshot(prior)); cached++; old.delete(item.id); continue; }
    const answer = snapshot(await bounded(s => evaluator(snapshot(item), snapshot(policy), { signal: s }), { timeoutMs, signal }));
    const p = answer.probability;
    ensure(Number.isFinite(p) && p >= 0 && p <= 1, 'Evaluator returned invalid probability'); evaluated++;
    // The dead band retains state but exposes uncertainty, avoiding repeated threshold flapping.
    const state = p >= policy.onThreshold ? 'true' : p <= policy.offThreshold ? 'false' : prior?.state ?? 'unknown';
    const entry = { id: item.id, inputFingerprint, probability: p, state, uncertain: p > policy.offThreshold && p < policy.onThreshold };
    if (answer.record !== undefined) entry.record = answer.record;
    next.push(entry);
    if (state !== (prior?.state ?? 'unknown')) transitions.push({ id: item.id, from: prior?.state ?? 'unknown', to: state });
    old.delete(item.id);
  }
  for (const entry of old.values()) transitions.push({ id: entry.id, from: entry.state, to: 'removed' });
  return { schemaVersion: 1, policyFingerprint, items: next, transitions, evaluated, cached };
}
export async function* watch(source, policy, { iterations = 1, intervalMs = 1000, ...options } = {}) {
  ensure(typeof source === 'function' && Number.isSafeInteger(iterations) && iterations > 0 && iterations <= 100000, 'Invalid source or iteration count');
  ensure(Number.isSafeInteger(intervalMs) && intervalMs >= 10 && intervalMs <= 3600000, 'Invalid polling interval');
  let previous = options.previous;
  for (let i = 0; i < iterations; i++) {
    const items = await bounded(signal => source({ signal }), options);
    previous = await scan(items, policy, { ...options, previous }); yield previous;
    if (i + 1 < iterations) await delay(intervalMs, undefined, { signal: options.signal });
  }
}
