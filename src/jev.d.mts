// Purpose: Type the optional Jev adapter and injectable provider.
import type { Provider } from '@gbesse/decisionpacks';
import type { Evaluator } from './index.mjs';
export function createJevEvaluator(options?: { provider?: Provider; signal?: AbortSignal }): Evaluator;
