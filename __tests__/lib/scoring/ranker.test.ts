/**
 * Tests for Phase 3 Ranking Logic
 */

import { rankProducts, type ProductBadge } from '@/lib/scoring/ranker'

interface ScoredProduct {
  id: string
  platform: string
  title: string
  price: number
  currency: string
  rating?: number
  reviews_count?: number
  shipping_time_days?: number
  shipping_price?: number
  image?: string
  url: string
  score: number
  confidence: number
  badge?: ProductBadge
}

describe('rankProducts - Phase 3', () => {
  // ===== Utility function to create test products =====
  function createProduct(overrides: Partial<ScoredProduct>): ScoredProduct {
    return {
      id: `product-${Math.random()}`,
      platform: 'amazon',
      title: 'Test Product',
      price: 100,
      currency: 'USD',
      url: 'https://example.com',
      score: 0.7,
      confidence: 0.8,
      ...overrides,
    }
  }

  // ===== Test 1: Best Choice =====
  describe('Best Choice (الأفضل إجمالاً)', () => {
    it('should assign best_choice badge to product with highest score and valid constraints', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.9,
          rating: 4.5,
          reviews_count: 100,
        }),
        createProduct({
          id: 'p2',
          score: 0.7,
          rating: 4.2,
          reviews_count: 60,
        }),
      ]

      const result = rankProducts(products)
      const bestChoice = result.find(p => p.badge === 'best_choice')

      expect(bestChoice).toBeDefined()
      expect(bestChoice?.id).toBe('p1')
    })

    it('should not assign best_choice if rating <= 4.0', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.95,
          rating: 3.9, // Below threshold
          reviews_count: 100,
        }),
        createProduct({
          id: 'p2',
          score: 0.8,
          rating: 4.1,
          reviews_count: 100,
        }),
      ]

      const result = rankProducts(products)
      const bestChoice = result.find(p => p.badge === 'best_choice')

      // Should assign to p2 instead
      expect(bestChoice?.id).toBe('p2')
    })

    it('should not assign best_choice if reviews_count <= 50', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.95,
          rating: 4.5,
          reviews_count: 50, // Not > 50
        }),
        createProduct({
          id: 'p2',
          score: 0.7,
          rating: 4.2,
          reviews_count: 51, // > 50
        }),
      ]

      const result = rankProducts(products)
      const bestChoice = result.find(p => p.badge === 'best_choice')

      expect(bestChoice?.id).toBe('p2')
    })

    it('should return null if no product meets best_choice constraints', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.9,
          rating: 3.9,
          reviews_count: 10,
        }),
      ]

      const result = rankProducts(products)
      const bestChoice = result.find(p => p.badge === 'best_choice')

      expect(bestChoice).toBeUndefined()
    })
  })

  // ===== Test 2: Best Value =====
  describe('Best Value (الأفضل قيمة مقابل السعر)', () => {
    it('should assign best_value to product with highest (rating * log(reviews)) / price ratio', () => {
      const products = [
        createProduct({
          id: 'p1',
          price: 50,
          rating: 4.0,
          reviews_count: 100,
          // value_score = (4.0 * log(100)) / 50 ≈ (4.0 * 4.605) / 50 ≈ 0.368
        }),
        createProduct({
          id: 'p2',
          price: 200,
          rating: 5.0,
          reviews_count: 1000,
          // value_score = (5.0 * log(1000)) / 200 ≈ (5.0 * 6.908) / 200 ≈ 0.173
        }),
      ]

      const result = rankProducts(products)
      const bestValue = result.find(p => p.badge === 'best_value')

      expect(bestValue).toBeDefined()
      expect(bestValue?.id).toBe('p1') // Higher ratio
    })

    it('should not assign best_value badge to product if best_choice already assigned', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.95,
          rating: 4.5,
          reviews_count: 100,
          price: 100,
          // Qualifies for best_choice; should not get best_value
        }),
      ]

      const result = rankProducts(products)
      const withBadges = result.filter(p => p.badge)

      expect(withBadges.length).toBe(1)
      expect(withBadges[0].badge).toBe('best_choice')
    })

    it('should skip products with zero/missing rating or price', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: 0,
          reviews_count: 100,
          price: 50,
        }),
        createProduct({
          id: 'p2',
          rating: 4.0,
          reviews_count: 50,
          price: 100,
        }),
      ]

      const result = rankProducts(products)
      const bestValue = result.find(p => p.badge === 'best_value')

      expect(bestValue?.id).toBe('p2')
    })
  })

  // ===== Test 3: Fastest Delivery =====
  describe('Fastest Delivery (الأسرع وصولاً)', () => {
    it('should assign fastest to product with minimum shipping_time_days', () => {
      const products = [
        createProduct({
          id: 'p1',
          shipping_time_days: 5,
        }),
        createProduct({
          id: 'p2',
          shipping_time_days: 2,
        }),
        createProduct({
          id: 'p3',
          shipping_time_days: 10,
        }),
      ]

      const result = rankProducts(products)
      const fastest = result.find(p => p.badge === 'fastest')

      expect(fastest).toBeDefined()
      expect(fastest?.id).toBe('p2')
    })

    it('should use score as tie-breaker if multiple products have same min shipping time', () => {
      const products = [
        createProduct({
          id: 'p1',
          shipping_time_days: 2,
          score: 0.7,
        }),
        createProduct({
          id: 'p2',
          shipping_time_days: 2,
          score: 0.9,
        }),
      ]

      const result = rankProducts(products)
      const fastest = result.find(p => p.badge === 'fastest')

      expect(fastest?.id).toBe('p2') // Higher score
    })

    it('should skip products without valid shipping_time_days', () => {
      const products = [
        createProduct({
          id: 'p1',
          shipping_time_days: undefined,
        }),
        createProduct({
          id: 'p2',
          shipping_time_days: 3,
        }),
      ]

      const result = rankProducts(products)
      const fastest = result.find(p => p.badge === 'fastest')

      expect(fastest?.id).toBe('p2')
    })
  })

  // ===== Test 4: Cheapest =====
  describe('Cheapest (الأرخص بجودة مقبولة)', () => {
    it('should assign cheapest to product with minimum price and rating >= 3.8', () => {
      const products = [
        createProduct({
          id: 'p1',
          price: 50,
          rating: 3.9,
        }),
        createProduct({
          id: 'p2',
          price: 30,
          rating: 4.0,
        }),
        createProduct({
          id: 'p3',
          price: 20,
          rating: 3.7, // Below threshold
        }),
      ]

      const result = rankProducts(products)
      const cheapest = result.find(p => p.badge === 'cheapest')

      expect(cheapest).toBeDefined()
      expect(cheapest?.id).toBe('p2') // Lowest price with rating >= 3.8
    })

    it('should not assign cheapest if no product meets quality constraint', () => {
      const products = [
        createProduct({
          id: 'p1',
          price: 20,
          rating: 3.7,
        }),
      ]

      const result = rankProducts(products)
      const cheapest = result.find(p => p.badge === 'cheapest')

      expect(cheapest).toBeUndefined()
    })

    it('should not assign cheapest if product already has another badge', () => {
      const products = [
        createProduct({
          id: 'p1',
          price: 50,
          rating: 4.5,
          reviews_count: 100,
          score: 0.95,
          // Will get best_choice
        }),
        createProduct({
          id: 'p2',
          price: 30,
          rating: 4.0,
          // Should get cheapest
        }),
      ]

      const result = rankProducts(products)
      const cheapest = result.find(p => p.badge === 'cheapest')

      expect(cheapest?.id).toBe('p2')
    })
  })

  // ===== Test 5: Priority & Exclusivity =====
  describe('Badge Priority & Exclusivity', () => {
    it('should respect priority: best_choice > best_value > fastest > cheapest', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.95,
          rating: 4.5,
          reviews_count: 100,
          price: 50,
          shipping_time_days: 1,
          // Qualifies for all categories; should only get best_choice
        }),
      ]

      const result = rankProducts(products)
      const badges = result.map(p => p.badge).filter(Boolean)

      expect(badges.length).toBe(1)
      expect(badges[0]).toBe('best_choice')
    })

    it('should assign different badges to different products', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.95,
          rating: 4.5,
          reviews_count: 100,
          price: 100,
          shipping_time_days: 5,
          // best_choice
        }),
        createProduct({
          id: 'p2',
          score: 0.6,
          rating: 4.0,
          reviews_count: 50,
          price: 50,
          shipping_time_days: 2,
          // best_value (after p1 assigned)
        }),
        createProduct({
          id: 'p3',
          score: 0.6,
          rating: 3.9,
          price: 150,
          shipping_time_days: 1,
          // fastest (after p1, p2 assigned)
        }),
      ]

      const result = rankProducts(products)
      const assignedBadges = result.filter(p => p.badge)

      expect(assignedBadges.length).toBeGreaterThanOrEqual(2)
      expect(assignedBadges.map(p => p.badge)).toContain('best_choice')
    })
  })

  // ===== Test 6: Edge Cases =====
  describe('Edge Cases', () => {
    it('should handle empty product list', () => {
      const result = rankProducts([])
      expect(result).toEqual([])
    })

    it('should handle products with missing optional fields', () => {
      const products = [
        createProduct({
          id: 'p1',
          rating: undefined,
          reviews_count: undefined,
          shipping_time_days: undefined,
        }),
      ]

      const result = rankProducts(products)
      expect(result).toHaveLength(1)
    })

    it('should handle custom config with different thresholds', () => {
      const products = [
        createProduct({
          id: 'p1',
          score: 0.9,
          rating: 3.5,
          reviews_count: 30,
        }),
      ]

      const customConfig = {
        bestChoiceMinRating: 3.0,
        bestChoiceMinReviews: 20,
        cheapestMinRating: 3.0,
      }

      const result = rankProducts(products, customConfig)
      const bestChoice = result.find(p => p.badge === 'best_choice')

      expect(bestChoice).toBeDefined()
      expect(bestChoice?.id).toBe('p1')
    })

    it('should be deterministic with same input', () => {
      const products = [
        createProduct({ id: 'p1', score: 0.8, rating: 4.5, reviews_count: 100 }),
        createProduct({ id: 'p2', score: 0.7, rating: 4.2, reviews_count: 60 }),
        createProduct({ id: 'p3', score: 0.6, rating: 4.0, reviews_count: 50 }),
      ]

      const result1 = rankProducts([...products])
      const result2 = rankProducts([...products])

      expect(result1).toEqual(result2)
    })
  })
})
