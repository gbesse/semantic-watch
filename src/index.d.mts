// Purpose: Describe versioned semantic monitoring and bounded asynchronous sources.
import type { DecisionRecord } from '@gbesse/decisionpacks';
export interface Item { id: string; text: string }
export interface Policy { id: string; condition: string; model: string; onThreshold: number; offThreshold: number }
export type State = 'true' | 'false' | 'unknown';
export interface Checkpoint { schemaVersion: 1; policyFingerprint: string; items: { id: string; inputFingerprint: string; probability: number; state: State; uncertain: boolean; record?: DecisionRecord }[]; transitions: { id: string; from: State; to: State | 'removed' }[]; evaluated: number; cached: number }
export type Evaluator = (item: Item, policy: Policy, options: { signal: AbortSignal }) => Promise<{ probability: number; record?: DecisionRecord }>;
export interface Options { evaluator: Evaluator; previous?: Checkpoint; timeoutMs?: number; signal?: AbortSignal; maxItems?: number }
export function validatePolicy(policy: unknown): Policy;
export function scan(items: Item[], policy: Policy, options: Options): Promise<Checkpoint>;
export function watch(source: (options: { signal: AbortSignal }) => Promise<Item[]>, policy: Policy, options: Options & { iterations?: number; intervalMs?: number }): AsyncGenerator<Checkpoint>;
