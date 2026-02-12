/**
 * Trust Layer Integration Tests
 * Comprehensive test suite for all trust components and orchestration
 */

import {
  enrichProductWithTrustData,
  enrichProductsWithTrustData,
  buildTrustContext,
  buildMinimalTrustContext,
  canApplyTrustLayer,
  needsTrustWarning,
  withoutTrustData,
  validateTrustContext,
} from '../../lib/trust'
import { generateTrustLabels } from '../../lib/trust/trustLabelsEngine'
import { generateRecommendationExplanation } from '../../lib/trust/recommendationExplainer'
import { generateConfidenceIndicator } from '../../lib/trust/confidenceIndicator'
import { generateOptimizedCTA } from '../../lib/trust/ctaOptimizer'
import { generateRiskDisclosure, formatRiskDisclosure, isProductRisky } from '../../lib/trust/riskDisclosure'
import { RecommendedProduct } from '../../lib/recommendation/types'

// Test fixtures
const mockProduct: RecommendedProduct = {
  id: 'test-1',
  product_name: 'Test Product',
  platform: 'amazon',
  price: 49.99,
  rating: 4.5,
  reviews_count: 120,
  delivery_days: 2,
  shipping_days: 5,
  badge: 'best_value',
  is_risky: false,
  score: 0.85,
  reasons: ['Good value'],
}

const mockProducts: RecommendedProduct[] = [
  { ...mockProduct, id: 'p1', price: 50, rating: 4.5, reviews_count: 100 },
  { ...mockProduct, id: 'p2', price: 45, rating: 4.0, reviews_count: 80 },
  { ...mockProduct, id: 'p3', price: 55, rating: 3.8, reviews_count: 60 },
  { ...mockProduct, id: 'p4', price: 40, rating: 5.0, reviews_count: 200 },
  { ...mockProduct, id: 'p5', price: 100, rating: 3.0, reviews_count: 10 },
]

describe('Trust Layer Integration', () => {
  describe('enrichProductWithTrustData', () => {
    test('should enrich product with all trust components', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(enriched.id).toBe('test-1')
      expect(enriched.trustData).toBeDefined()
      expect(enriched.trustData.labels).toBeDefined()
      expect(enriched.trustData.explanation).toBeDefined()
      expect(enriched.trustData.confidence).toBeDefined()
      expect(enriched.trustData.cta).toBeDefined()
      expect(enriched.trustData.riskDisclosure).toBeDefined()
    })

    test('should include trust labels', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(Array.isArray(enriched.trustData.labels)).toBe(true)
      expect(enriched.trustData.labels.length).toBeGreaterThan(0)
      expect(enriched.trustData.labels[0]).toHaveProperty('label')
      expect(enriched.trustData.labels[0]).toHaveProperty('reason')
    })

    test('should include recommendation explanation', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(enriched.trustData.explanation).toHaveProperty('points')
      expect(enriched.trustData.explanation).toHaveProperty('sentiment')
      expect(Array.isArray(enriched.trustData.explanation.points)).toBe(true)
      expect(enriched.trustData.explanation.points.length).toBeLessThanOrEqual(3)
    })

    test('should include confidence indicator', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(enriched.trustData.confidence).toHaveProperty('level')
      expect(enriched.trustData.confidence).toHaveProperty('missing')
      expect(['Low', 'Medium', 'High']).toContain(enriched.trustData.confidence.level)
    })

    test('should include optimized CTA', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(enriched.trustData.cta).toHaveProperty('variant')
      expect(enriched.trustData.cta).toHaveProperty('copy')
      expect(enriched.trustData.cta).toHaveProperty('reason')
      expect(['buy_recommendation', 'check_price', 'get_option']).toContain(
        enriched.trustData.cta.variant
      )
    })

    test('should include risk disclosure', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)

      expect(enriched.trustData.riskDisclosure).toHaveProperty('hasRisk')
      expect(enriched.trustData.riskDisclosure).toHaveProperty('severity')
      expect(enriched.trustData.riskDisclosure).toHaveProperty('warnings')
      expect(['low', 'medium', 'high']).toContain(enriched.trustData.riskDisclosure.severity)
    })
  })

  describe('enrichProductsWithTrustData', () => {
    test('should enrich multiple products', () => {
      const enriched = enrichProductsWithTrustData(mockProducts)

      expect(enriched.length).toBe(mockProducts.length)
      enriched.forEach((product, index) => {
        expect(product.id).toBe(mockProducts[index].id)
        expect(product.trustData).toBeDefined()
      })
    })

    test('should handle empty array', () => {
      const enriched = enrichProductsWithTrustData([])
      expect(enriched).toEqual([])
    })

    test('should handle single product', () => {
      const enriched = enrichProductsWithTrustData([mockProduct])
      expect(enriched.length).toBe(1)
      expect(enriched[0].trustData).toBeDefined()
    })

    test('should preserve original product data', () => {
      const enriched = enrichProductsWithTrustData([mockProduct])
      expect(enriched[0].price).toBe(mockProduct.price)
      expect(enriched[0].rating).toBe(mockProduct.rating)
      expect(enriched[0].badge).toBe(mockProduct.badge)
    })

    test('should apply custom thresholds', () => {
      const customThresholds = {
        minRatingForSafe: 3.5,
        minReviewsForReliable: 30,
        minReviewsForChosen: 5,
        ValueScoreThreshold: 0.4,
        mostReviewedPercentile: 70,
        lowRatingThreshold: 3.0,
        lowReviewThreshold: 3,
      }
      const enriched = enrichProductsWithTrustData(mockProducts, customThresholds)

      expect(enriched.length).toBe(mockProducts.length)
      enriched.forEach(product => {
        expect(product.trustData).toBeDefined()
      })
    })
  })

  describe('buildTrustContext', () => {
    test('should build context from products array', () => {
      const context = buildTrustContext(mockProducts)

      expect(context.allProducts).toBeDefined()
      expect(context.allProducts.length).toBe(mockProducts.length)
      expect(context.thresholds).toBeDefined()
    })

    test('should include all products in context', () => {
      const context = buildTrustContext(mockProducts)

      expect(context.allProducts.every(p => p.id)).toBe(true)
      expect(context.allProducts.every(p => p.product_name)).toBe(true)
    })

    test('should accept custom thresholds', () => {
      const customThresholds = {
        minRatingForSafe: 3.0,
        minReviewsForReliable: 10,
        minReviewsForChosen: 1,
        ValueScoreThreshold: 0.3,
        mostReviewedPercentile: 60,
        lowRatingThreshold: 2.5,
        lowReviewThreshold: 1,
      }
      const context = buildTrustContext(mockProducts, customThresholds)

      expect(context.thresholds.minRatingForSafe).toBe(3.0)
      expect(context.thresholds.minReviewsForReliable).toBe(10)
    })

    test('should handle empty array', () => {
      const context = buildTrustContext([])
      expect(context.allProducts).toEqual([])
      expect(context.thresholds).toBeDefined()
    })
  })

  describe('buildMinimalTrustContext', () => {
    test('should build context from single product', () => {
      const context = buildMinimalTrustContext(mockProduct)

      expect(context.allProducts.length).toBe(1)
      expect(context.allProducts[0].id).toBe(mockProduct.id)
    })

    test('should accept additional products', () => {
      const context = buildMinimalTrustContext(mockProduct, mockProducts)

      expect(context.allProducts.length).toBe(mockProducts.length)
    })

    test('should use default thresholds', () => {
      const context = buildMinimalTrustContext(mockProduct)

      expect(context.thresholds.minRatingForSafe).toBe(4.0)
    })
  })

  describe('needsTrustWarning', () => {
    test('should detect risky products', () => {
      const riskyProduct = { ...mockProduct, rating: 2.5, reviews_count: 5 }
      const context = buildTrustContext([riskyProduct])
      const hasWarning = needsTrustWarning(riskyProduct, context)

      expect(hasWarning).toBe(true)
    })

    test('should not warn for safe products', () => {
      const safeProduct = { ...mockProduct, rating: 5.0, reviews_count: 500 }
      const context = buildTrustContext([safeProduct])
      const hasWarning = needsTrustWarning(safeProduct, context)

      expect(hasWarning).toBe(false)
    })

    test('should warn for products with suspiciously low prices', () => {
      const cheapProduct = { ...mockProduct, price: 5, rating: 3.0, reviews_count: 10 }
      const context = buildTrustContext([...mockProducts, cheapProduct])
      const hasWarning = needsTrustWarning(cheapProduct, context)

      expect(hasWarning).toBe(true) // Extremely low price should warn
    })

    test('should warn for products with few reviews', () => {
      const newProduct = { ...mockProduct, reviews_count: 2, rating: 4.0 }
      const context = buildTrustContext([newProduct])
      const hasWarning = needsTrustWarning(newProduct, context)

      expect(hasWarning).toBe(true)
    })
  })

  describe('canApplyTrustLayer', () => {
    test('should return true for products with required fields', () => {
      expect(canApplyTrustLayer(mockProduct)).toBe(true)
    })

    test('should return false for products without id', () => {
      const incomplete = { ...mockProduct, id: '' }
      expect(canApplyTrustLayer(incomplete)).toBe(false)
    })

    test('should return false for products without product_name', () => {
      const incomplete = { ...mockProduct, product_name: '' }
      expect(canApplyTrustLayer(incomplete)).toBe(false)
    })

    test('should return false for products without platform', () => {
      const incomplete = { ...mockProduct, platform: '' as any }
      expect(canApplyTrustLayer(incomplete)).toBe(false)
    })
  })

  describe('withoutTrustData', () => {
    test('should remove trust data from product', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)
      const cleaned = withoutTrustData(enriched)

      expect(cleaned.trustData).toBeUndefined()
      expect(cleaned.id).toBe(mockProduct.id)
      expect(cleaned.price).toBe(mockProduct.price)
    })

    test('should preserve all other product data', () => {
      const context = buildTrustContext(mockProducts)
      const enriched = enrichProductWithTrustData(mockProduct, context)
      const cleaned = withoutTrustData(enriched)

      expect(cleaned.product_name).toBe(enriched.product_name)
      expect(cleaned.platform).toBe(enriched.platform)
      expect(cleaned.rating).toBe(enriched.rating)
      expect(cleaned.badge).toBe(enriched.badge)
    })
  })

  describe('validateTrustContext', () => {
    test('should validate correct context', () => {
      const context = buildTrustContext(mockProducts)
      expect(validateTrustContext(context)).toBe(true)
    })

    test('should reject context with missing allProducts', () => {
      const invalid = { allProducts: undefined, thresholds: {} }
      expect(validateTrustContext(invalid as any)).toBe(false)
    })

    test('should reject context with non-array allProducts', () => {
      const invalid = { allProducts: 'not-array', thresholds: {} }
      expect(validateTrustContext(invalid as any)).toBe(false)
    })

    test('should reject context without thresholds', () => {
      const invalid = { allProducts: [], thresholds: undefined }
      expect(validateTrustContext(invalid as any)).toBe(false)
    })

    test('should reject products without id', () => {
      const invalid = {
        allProducts: [{ id: '', product_name: 'Test', platform: 'amazon' }],
        thresholds: {},
      }
      expect(validateTrustContext(invalid as any)).toBe(false)
    })
  })

  describe('Trust Layer Real-World Scenarios', () => {
    test('should handle budget product recommendation', () => {
      const budgetProduct = { ...mockProduct, price: 15, rating: 3.5, reviews_count: 30 }
      const context = buildTrustContext([...mockProducts, budgetProduct])
      const enriched = enrichProductWithTrustData(budgetProduct, context)

      expect(enriched.trustData.trustData).toBeDefined()
      const risk = enriched.trustData.riskDisclosure
      expect(risk.mitigation).toContain('budget') // Should suggest as budget option
    })

    test('should handle premium product recommendation', () => {
      const premiumProduct = { ...mockProduct, price: 200, rating: 4.8, reviews_count: 500 }
      const context = buildTrustContext([...mockProducts, premiumProduct])
      const enriched = enrichProductWithTrustData(premiumProduct, context)

      expect(enriched.trustData.cta.variant).toBe('buy_recommendation')
      expect(enriched.trustData.confidence.level).toBe('High')
    })

    test('should handle emerging product recommendation', () => {
      const emergingProduct = { ...mockProduct, price: 40, rating: 4.2, reviews_count: 3 }
      const context = buildTrustContext([...mockProducts, emergingProduct])
      const enriched = enrichProductWithTrustData(emergingProduct, context)

      const risk = enriched.trustData.riskDisclosure
      expect(risk.warnings.length).toBeGreaterThan(0)
    })

    test('should handle risky product recommendation', () => {
      const riskyProduct = { ...mockProduct, price: 8, rating: 2.0, reviews_count: 2, is_risky: true }
      const context = buildTrustContext([...mockProducts, riskyProduct])
      const enriched = enrichProductWithTrustData(riskyProduct, context)

      expect(enriched.trustData.riskDisclosure.hasRisk).toBe(true)
      expect(enriched.trustData.riskDisclosure.severity).toBe('high')
      expect(enriched.trustData.cta.variant).toBe('get_option')
    })

    test('should handle complete data product', () => {
      const completeProduct = {
        ...mockProduct,
        price: 45,
        rating: 4.6,
        reviews_count: 250,
        delivery_days: 1,
        shipping_days: 3,
      }
      const context = buildTrustContext([...mockProducts, completeProduct])
      const enriched = enrichProductWithTrustData(completeProduct, context)

      expect(enriched.trustData.confidence.level).toBe('High')
      expect(enriched.trustData.confidence.missing.length).toBe(0)
    })

    test('should handle incomplete data product', () => {
      const incompleteProduct = {
        ...mockProduct,
        rating: undefined,
        reviews_count: undefined,
        delivery_days: undefined,
        shipping_days: undefined,
      }
      const context = buildTrustContext([incompleteProduct])
      const enriched = enrichProductWithTrustData(incompleteProduct, context)

      expect(enriched.trustData.confidence.level).toBe('Low')
      expect(enriched.trustData.confidence.missing.length).toBeGreaterThan(0)
    })
  })

  describe('Rich Disclosure Integration', () => {
    test('should include formatted risk disclosure', () => {
      const riskyProduct = { ...mockProduct, price: 10, rating: 2.0, reviews_count: 1 }
      const context = buildTrustContext([riskyProduct])
      const disclosure = generateRiskDisclosure(
        {
          id: riskyProduct.id,
          product_name: riskyProduct.product_name,
          platform: riskyProduct.platform,
          price: riskyProduct.price,
          rating: riskyProduct.rating,
          reviews_count: riskyProduct.reviews_count,
          is_risky: riskyProduct.is_risky,
        },
        context
      )

      const formatted = formatRiskDisclosure(disclosure)
      expect(formatted.length).toBeGreaterThan(0)
      expect(typeof formatted).toBe('string')
    })

    test('should identify truly risky products', () => {
      const riskyProduct = { ...mockProduct, price: 5, rating: 1.5, reviews_count: 1 }
      const context = buildTrustContext([riskyProduct])
      const isRisky = isProductRisky(
        {
          id: riskyProduct.id,
          product_name: riskyProduct.product_name,
          platform: riskyProduct.platform,
          price: riskyProduct.price,
          rating: riskyProduct.rating,
          reviews_count: riskyProduct.reviews_count,
          is_risky: riskyProduct.is_risky,
        },
        context
      )

      expect(isRisky).toBe(true)
    })
  })
})
