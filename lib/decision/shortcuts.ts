export interface ProductOption<T = any> {
  id: string;
  title: string;
  score: number; // higher is better
  price?: number;
  rating?: number;
  meta?: T;
}

export interface DecisionSet<T = any> {
  primary: ProductOption<T>;
  alternatives: ProductOption<T>[]; // max 3
}

// Choose top N alternatives from a sorted product list. Returns primary + up to 3 alternatives.
export function buildDecisionShortcuts<T>(products: ProductOption<T>[]): DecisionSet<T> | null {
  if (!products || products.length === 0) return null;

  // assume input may not be sorted; sort by score desc
  const sorted = [...products].sort((a, b) => b.score - a.score);
  const primary = sorted[0];
  const alternatives = sorted.slice(1, 4);

  // annotate Best Value: choose the one with best price-to-score ratio among top 3
  const bestValueCandidate = [primary, ...alternatives]
    .filter(Boolean)
    .reduce((best, cur) => {
      if (!best) return cur;
      const bestRatio = (best.price ?? 1) / Math.max(1, best.score);
      const curRatio = (cur.price ?? 1) / Math.max(1, cur.score);
      return curRatio < bestRatio ? cur : best;
    }, null as ProductOption<T> | null);

  // mark flags in meta
  const mark = (p: ProductOption<T>) => ({ ...p, meta: { ...p.meta, isBestValue: p.id === bestValueCandidate?.id } });

  return { primary: mark(primary), alternatives: alternatives.map(mark) };
}
