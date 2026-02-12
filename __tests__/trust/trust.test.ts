import { computeTrustScore } from '../../lib/trust/trust';

describe('computeTrustScore', () => {
  test('high rating & many reviews yields high trust', () => {
    const res = computeTrustScore({ average_rating: 4.8, number_of_reviews: 5000, price: 18, category_avg_price: 22, seller_reputation: 90, return_rate: 0.02 });
    expect(res.trust_score).toBeGreaterThan(70);
  });

  test('low rating yields low trust', () => {
    const res = computeTrustScore({ average_rating: 2.1, number_of_reviews: 10, price: 50, category_avg_price: 40, seller_reputation: 20, return_rate: 0.2 });
    expect(res.trust_score).toBeLessThan(50);
  });
});
