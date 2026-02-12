/**
 * Tests for Phase 4 Guardrails Logic
 */

import { applyGuardrails, getRecommendedOnly, getAllWithWarnings, type GuardrailConfig } from '@/lib/recommendation/guardrails'

interface TestProduct {
  id: string
  platform: string
  title: string
  price: number
  currency: string
  url: string
  rating?: number
  reviews_count?: number
  shipping_time_days?: number
  shipping_price?: number
  category?: string
  brand?: string
  description?: string
  badge?: 'best_choice' | 'best_value' | 'fastest' | 'cheapest'
}

function createProduct(overrides: Partial<TestProduct>): TestProduct {
  return {
    id: `product-${Math.random().toString(36).substr(2, 9)}`,
    platform: 'amazon',
    title: 'Test Product',
    price: 100,
    currency: 'USD',
    url: 'https://example.com',
    ...overrides,
  }
}

describe('applyGuardrails - Phase 4', () => {
  // ===== Test 1: Minimum Quality Floor =====
  describe('Rule 1: Minimum Quality Floor', () => {
    it('should mark product with rating >= 4.0 as recommended', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.0,
          reviews_count: 20,
          price: 100,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].isRecommended).toBe(true)
      expect(result[0].is_risky).toBe(false)
      expect(result[0].reasoning_tags).toContain('High Rating')
    })

    it('should mark product with rating < 4.0 as risky', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 3.9,
          reviews_count: 20,
          price: 100,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].is_risky).toBe(true)
      expect(result[0].risk_reasons.some(r => r.includes('Rating'))).toBe(true)
    })

    it('should mark single option with low rating as risky but still recommended', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 3.5,
          reviews_count: 5,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].isRecommended).toBe(true)
      expect(result[0].is_risky).toBe(true)
    })

    it('should exclude low-rated product when better alternatives exist', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 3.5,
          reviews_count: 20,
        }),
        createProduct({
          id: 'p2',
          rating: 4.5,
          reviews_count: 20,
        }),
      ]

      const result = applyGuardrails(products)
      const p1 = result.find(p => p.id === 'p1')

      expect(p1?.isRecommended).toBe(false)
      expect(p1?.is_risky).toBe(true)
    })
  })

  // ===== Test 2: Social Proof Threshold =====
  describe('Rule 2: Social Proof Threshold', () => {
    it('should recommend product with sufficient reviews', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.2,
          reviews_count: 20,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].isRecommended).toBe(true)
      expect(result[0].reasoning_tags).toContain('Trusted Seller')
    })

    it('should flag product with insufficient reviews', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 2,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].is_risky).toBe(true)
      expect(result[0].risk_reasons.some(r => r.includes('review'))).toBe(true)
    })

    it('should use category-specific review thresholds', () => {
      const config: GuardrailConfig = {
        global: {
          minRating: 4.0,
          minReviewCount: 10,
          priceOutlierFactor: 0.4,
        },
        categories: {
          fashion: {
            minRating: 3.9,
            minReviewCount: 3, // Lower threshold for fashion
            priceOutlierFactor: 0.4,
          },
        },
      }

      const products = [
        createProduct({
          id: 'p1',
          category: 'fashion',
          rating: 4.0,
          reviews_count: 4,
        }),
      ]

      const result = applyGuardrails(products, config)

      expect(result[0].isRecommended).toBe(true)
      expect(result[0].is_risky).toBe(false)
    })
  })

  // ===== Test 3: Outlier Price Detection =====
  describe('Rule 3: Outlier Price Detection (Anti-Scam)', () => {
    it('should flag suspiciously low prices', () => {
      const products = [
        createProduct({ id: 'p1', price: 20, rating: 4.5, reviews_count: 20 }),
        createProduct({ id: 'p2', price: 100, rating: 4.2, reviews_count: 20 }),
        createProduct({ id: 'p3', price: 110, rating: 4.0, reviews_count: 20 }),
      ]

      const result = applyGuardrails(products)
      const p1 = result.find(p => p.id === 'p1')

      expect(p1?.is_risky).toBe(true)
      expect(p1?.risk_reasons.some(r => r.includes('60%+'))).toBe(true)
    })

    it('should mark reasonably cheap prices as "Good Deal"', () => {
      const products = [
        createProduct({ id: 'p1', price: 85, rating: 4.5, reviews_count: 20 }),
        createProduct({ id: 'p2', price: 100, rating: 4.2, reviews_count: 20 }),
        createProduct({ id: 'p3', price: 110, rating: 4.0, reviews_count: 20 }),
      ]

      const result = applyGuardrails(products)
      const p1 = result.find(p => p.id === 'p1')

      expect(p1?.reasoning_tags).toContain('Good Deal')
      expect(p1?.is_risky).toBe(false)
    })

    it('should not flag prices with few products to compare', () => {
      const products = [createProduct({ id: 'p1', price: 20, rating: 4.5, reviews_count: 20 })]

      const result = applyGuardrails(products)

      // No outlier check possible with only 1 product
      expect(result[0].is_risky).toBe(false)
    })
  })

  // ===== Test 4: Platform Reliability =====
  describe('Rule 4: Platform Reliability Logic', () => {
    it('should trust products from known platforms', () => {
      const products = [
        createProduct({
          id: 'p1',
          platform: 'amazon',
          rating: 4.1,
          reviews_count: 8, // Below default threshold
        }),
      ]

      const result = applyGuardrails(products)

      // Platform trust should relax the standards
      expect(result[0].isRecommended).toBe(true)
      expect(result[0].reasoning_tags).toContain('Trusted Seller')
    })

    it('should be stricter for unknown platforms', () => {
      const products = [
        createProduct({
          id: 'p1',
          platform: 'unknown-store',
          rating: 4.2,
          reviews_count: 10,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].is_risky).toBe(true)
      expect(result[0].risk_reasons.some(r => r.includes('not in trusted'))).toBe(true)
    })

    it('should apply stricter standards to new platforms', () => {
      const config: GuardrailConfig = {
        global: {
          minRating: 4.0,
          minReviewCount: 10,
          priceOutlierFactor: 0.4,
        },
        stricterPlatforms: ['third-party'],
      }

      const products = [
        createProduct({
          id: 'p1',
          platform: 'third-party',
          rating: 4.0,
          reviews_count: 15,
        }),
      ]

      const result = applyGuardrails(products, config)

      // Stricter platforms have higher rating requirement
      expect(result[0].is_risky).toBe(true)
    })
  })

  // ===== Test 5: Positive Signals =====
  describe('Feature: Positive Signals & Reasoning Tags', () => {
    it('should include fast shipping tags', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
          shipping_time_days: 1,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].reasoning_tags).toContain('Express Shipping')
    })

    it('should include free shipping tag', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
          shipping_price: 0,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].reasoning_tags).toContain('Free Shipping')
    })

    it('should include badge from Phase 3', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
          badge: 'best_choice',
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].reasoning_tags).toContain('Category Winner')
    })

    it('should include brand information', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
          brand: 'Samsung',
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].reasoning_tags.some(t => t.includes('Samsung'))).toBe(true)
    })

    it('should accumulate multiple positive signals', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 30,
          shipping_time_days: 1,
          shipping_price: 0,
          brand: 'Sony',
          badge: 'best_value',
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].reasoning_tags.length).toBeGreaterThan(4)
      expect(result[0].reasoning_tags).toContain('High Rating')
      expect(result[0].reasoning_tags).toContain('Express Shipping')
      expect(result[0].reasoning_tags).toContain('Free Shipping')
      expect(result[0].reasoning_tags).toContain('Best Value')
    })
  })

  // ===== Test 6: Filter Functions =====
  describe('Filter Functions', () => {
    it('getRecommendedOnly should return only safe products', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
        }),
        createProduct({
          id: 'p2',
          rating: 3.5,
          reviews_count: 2,
        }),
      ]

      const guarded = applyGuardrails(products)
      const recommended = getRecommendedOnly(guarded)

      expect(recommended.length).toBe(1)
      expect(recommended[0].id).toBe('p1')
    })

    it('getAllWithWarnings should return all products', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 4.5,
          reviews_count: 20,
        }),
        createProduct({
          id: 'p2',
          rating: 3.5,
          reviews_count: 2,
        }),
      ]

      const guarded = applyGuardrails(products)
      const all = getAllWithWarnings(guarded)

      expect(all.length).toBe(2)
    })
  })

  // ===== Test 7: Edge Cases =====
  describe('Edge Cases', () => {
    it('should handle empty product list', () => {
      const result = applyGuardrails([])
      expect(result).toEqual([])
    })

    it('should handle products with missing fields', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: undefined,
          reviews_count: undefined,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].is_risky).toBe(true)
      expect(result[0].isRecommended).toBe(true) // Only option
    })

    it('should handle zero prices', () => {
      const products = [
        createProduct({
          id: 'p1',
          price: 0,
          rating: 4.5,
          reviews_count: 20,
        }),
      ]

      const result = applyGuardrails(products)

      // Should not crash, mark as risky
      expect(result[0].is_risky).toBe(true)
    })

    it('should handle products with zero reviews', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 5.0,
          reviews_count: 0,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].is_risky).toBe(true)
      expect(result[0].risk_reasons.some(r => r.includes('review'))).toBe(true)
    })

    it('should be deterministic', () => {
      const products = [
        createProduct({ id: 'p1', rating: 4.5, reviews_count: 20 }),
        createProduct({ id: 'p2', rating: 4.0, reviews_count: 10 }),
      ]

      const result1 = applyGuardrails([...products])
      const result2 = applyGuardrails([...products])

      expect(result1).toEqual(result2)
    })
  })

  // ===== Test 8: Integration with Phase 3 Badges =====
  describe('Integration with Phase 3 Badges', () => {
    it('should enhance badge visibility with guardrail info', () => {
      const products = [
        createProduct({
          id: 'p1',
          badge: 'best_choice',
          rating: 4.8,
          reviews_count: 150,
          shipping_time_days: 1,
          shipping_price: 0,
        }),
      ]

      const result = applyGuardrails(products)

      expect(result[0].badge).toBe('best_choice')
      expect(result[0].isRecommended).toBe(true)
      expect(result[0].is_risky).toBe(false)
      expect(result[0].reasoning_tags).toContain('Category Winner')
    })
  })

  // ===== Test 9: Custom Configuration =====
  describe('Custom Configuration', () => {
    it('should apply custom thresholds', () => {
      const customConfig: GuardrailConfig = {
        global: {
          minRating: 3.5, // Lower threshold
          minReviewCount: 5,
          priceOutlierFactor: 0.5,
        },
      }

      const products = [
        createProduct({
          id: 'p1',
          rating: 3.6,
          reviews_count: 8,
        }),
      ]

      const result = applyGuardrails(products, customConfig)

      expect(result[0].isRecommended).toBe(true)
      expect(result[0].is_risky).toBe(false)
    })

    it('should support category-specific overrides', () => {
      const customConfig: GuardrailConfig = {
        global: {
          minRating: 4.0,
          minReviewCount: 10,
          priceOutlierFactor: 0.4,
        },
        categories: {
          electronics: {
            minRating: 4.3,
            minReviewCount: 50,
            priceOutlierFactor: 0.35,
          },
        },
      }

      const products = [
        createProduct({
          id: 'p1',
          category: 'electronics',
          rating: 4.1,
          reviews_count: 20,
        }),
      ]

      const result = applyGuardrails(products, customConfig)

      // Should fail electronics category checks
      expect(result[0].is_risky).toBe(true)
    })
  })
})
