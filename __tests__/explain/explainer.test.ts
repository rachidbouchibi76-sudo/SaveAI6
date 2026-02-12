import { generateExplanation } from '../../lib/explain/explainer';

describe('generateExplanation', () => {
  test('creates a combined explanation', () => {
    const text = generateExplanation({ productTitle: 'Widget', average_rating: 4.6, number_of_reviews: 3200, price: 82, category_avg_price: 100, trust_score: 85 });
    expect(text).toContain('4.6⭐');
    expect(text).toContain('3200');
    expect(text).toContain('costs');
    expect(text).toContain('trust score');
  });
});
