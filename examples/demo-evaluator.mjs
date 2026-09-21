// Purpose: Supply synthetic probabilities for an offline demonstration, not semantic inference.
export async function evaluate(item) { return { probability: Number(item.text), source: 'synthetic_fixture' }; }
