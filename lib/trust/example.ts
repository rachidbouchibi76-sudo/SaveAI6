/**
 * Trust Layer Usage Examples
 * Real-world integration patterns for the trust & conversion layer
 */

import {
  enrichProductsWithTrustData,
  buildTrustContext,
  extractTrustData,
  canApplyTrustLayer,
  needsTrustWarning,
  validateTrustContext,
} from '../../lib/trust'
import { formatRiskDisclosure } from '../../lib/trust/riskDisclosure'
import { RecommendedProduct } from '../../lib/recommendation/types'

// ============================================================================
// Example 1: Basic Trust Enrichment in API Response
// ============================================================================

export async function exampleBasicAPIResponse() {
  /**
   * Scenario: API endpoint returns recommended products with trust data
   * Use case: /api/search endpoint enriching final results
   */

  const recommendedProducts: RecommendedProduct[] = [
    {
      id: 'prod-1',
      product_name: 'Wireless Earbuds Pro',
      platform: 'amazon',
      price: 79.99,
      rating: 4.6,
      reviews_count: 2340,
      delivery_days: 2,
      shipping_days: 7,
      badge: 'best_value',
      is_risky: false,
      score: 0.92,
      reasons: ['Great value', 'Fast shipping', 'Well-reviewed'],
    },
    {
      id: 'prod-2',
      product_name: 'Budget Earbuds Basic',
      platform: 'shein',
      price: 25.99,
      rating: 3.2,
      reviews_count: 45,
      delivery_days: 14,
      shipping_days: 21,
      badge: 'cheapest',
      is_risky: true,
      score: 0.65,
      reasons: ['Lowest price'],
    },
  ]

  // Enrich with trust data
  const enriched = enrichProductsWithTrustData(recommendedProducts)

  // Format for API response
  const response = enriched.map(product => ({
    id: product.id,
    name: product.product_name,
    platform: product.platform,
    price: product.price,
    rating: product.rating,
    badge: product.badge,
    // Trust layer data
    trustSignals: {
      labels: product.trustData.labels,
      explanation: product.trustData.explanation,
      confidence: product.trustData.confidence,
      cta: product.trustData.cta,
      warning: product.trustData.riskDisclosure.hasRisk
        ? formatRiskDisclosure(product.trustData.riskDisclosure)
        : null,
    },
  }))

  return response
  // Returns:
  // [
  //   {
  //     id: 'prod-1',
  //     name: 'Wireless Earbuds Pro',
  //     trustSignals: {
  //       labels: [{ label: 'best_value', reason: '...' }, ...],
  //       explanation: { points: ['...', '...', '...'], sentiment: 'positive' },
  //       confidence: { level: 'High', missing: [] },
  //       cta: { variant: 'buy_recommendation', copy: '...', reason: '...' },
  //       warning: null
  //     }
  //   },
  //   {
  //     id: 'prod-2',
  //     name: 'Budget Earbuds Basic',
  //     trustSignals: {
  //       labels: [...],
  //       explanation: { points: [...], sentiment: 'cautious' },
  //       confidence: { level: 'Medium', missing: ['delivery_days'] },
  //       cta: { variant: 'get_option', copy: '...', reason: '...' },
  //       warning: '⚠️ Heads up: ... • Lower rating than average'
  //     }
  //   }
  // ]
}

// ============================================================================
// Example 2: Customer-Facing Product Card with Trust
// ============================================================================

export function exampleProductCardRendering() {
  /**
   * Scenario: React component using trust data to render rich product card
   * Use case: Frontend product listing with trust indicators
   */

  const trustProduct = {
    id: 'prod-1',
    product_name: 'Wireless Earbuds Pro',
    platform: 'amazon' as const,
    price: 79.99,
    rating: 4.6,
    reviews_count: 2340,
    delivery_days: 2,
    shipping_days: 7,
    badge: 'best_value' as const,
    is_risky: false,
    score: 0.92,
    reasons: [],
    trustData: {
      labels: [
        { label: 'best_value' as const, reason: 'Best value for features and price' },
        { label: 'most_reviewed' as const, reason: '2340 customer reviews' },
      ],
      explanation: {
        points: [
          'Excellent audio quality with active noise cancellation',
          'Fast 2-day delivery available',
          'Highly trusted by 2,340+ verified customers',
        ],
        sentiment: 'positive' as const,
      },
      confidence: {
        level: 'High' as const,
        missing: [],
      },
      cta: {
        variant: 'buy_recommendation' as const,
        copy: 'Buy with Confidence',
        reason:
          'High confidence based on excellent reviews, rating, and customer feedback',
      },
      riskDisclosure: {
        hasRisk: false,
        severity: 'low' as const,
        warnings: [],
      },
    },
  }

  // Example React component pseudo-code
  const htmlStructure = `
    <div class="product-card">
      <h3>${trustProduct.product_name}</h3>
      <div class="price">${trustProduct.price}</div>
      
      <!-- Trust Badges -->
      <div class="badges">
        ${trustProduct.trustData.labels
          .map(label => `<span class="badge badge-${label.label}">${label.reason}</span>`)
          .join('')}
      </div>
      
      <!-- Explanation -->
      <div class="explanation">
        <p class="sentiment sentiment-${trustProduct.trustData.explanation.sentiment}">
          <strong>Why we recommend this:</strong>
        </p>
        <ul>
          ${trustProduct.trustData.explanation.points
            .map(point => `<li>${point}</li>`)
            .join('')}
        </ul>
      </div>
      
      <!-- Confidence Indicator -->
      <div class="confidence confidence-${trustProduct.trustData.confidence.level.toLowerCase()}">
        <span>Data Quality: ${trustProduct.trustData.confidence.level}</span>
      </div>
      
      <!-- CTA Button -->
      <button class="cta-button cta-${trustProduct.trustData.cta.variant}">
        ${trustProduct.trustData.cta.copy}
        <small>${trustProduct.trustData.cta.reason}</small>
      </button>
      
      <!-- Risk Warning (if applicable) -->
      ${trustProduct.trustData.riskDisclosure.hasRisk ? `
        <div class="warning warning-${trustProduct.trustData.riskDisclosure.severity}">
          ${trustProduct.trustData.riskDisclosure.warnings.join('<br>')}
        </div>
      ` : ''}
    </div>
  `

  return htmlStructure
}

// ============================================================================
// Example 3: Conditional UI Rendering Based on Trust
// ============================================================================

export function exampleConditionalRendering() {
  /**
   * Scenario: Show different UI components based on confidence level
   * Use case: Progressive disclosure strategy
   */

  function renderProductWithAdaptiveUI(product: RecommendedProduct & { trustData: any }) {
    const confidence = product.trustData.confidence.level

    switch (confidence) {
      case 'High':
        // Show full recommendation with confidence
        return {
          template: 'full-recommendation',
          components: ['badges', 'explanation', 'cta-strong', 'social-proof'],
          layout: 'prominent',
        }

      case 'Medium':
        // Show balanced recommendation
        return {
          template: 'balanced-recommendation',
          components: ['badges', 'mini-explanation', 'cta-standard', 'missing-data-note'],
          layout: 'standard',
        }

      case 'Low':
        // Show cautious recommendation
        return {
          template: 'cautious-recommendation',
          components: ['simple-badge', 'skeptical-cta', 'missing-data-warning'],
          layout: 'minimal',
        }
    }
  }

  return renderProductWithAdaptiveUI
}

// ============================================================================
// Example 4: A/B Testing Trust Components
// ============================================================================

export function exampleABTesting() {
  /**
   * Scenario: Test different trust messaging variants
   * Use case: Optimize conversion rate through messaging
   */

  function buildABTestVariant(
    products: (RecommendedProduct & { trustData: any })[],
    variant: 'control' | 'enhanced_labels' | 'enhanced_explanation' | 'enhanced_cta'
  ) {
    return products.map(product => {
      switch (variant) {
        case 'control':
          // Minimal trust signals
          return {
            ...product,
            displayTrust: {
              badge: product.trustData.labels[0]?.label || 'none',
              cta: product.trustData.cta,
            },
          }

        case 'enhanced_labels':
          // Show all labels
          return {
            ...product,
            displayTrust: {
              badges: product.trustData.labels,
              cta: product.trustData.cta,
            },
          }

        case 'enhanced_explanation':
          // Show full explanation
          return {
            ...product,
            displayTrust: {
              badges: product.trustData.labels,
              explanation: product.trustData.explanation,
              cta: product.trustData.cta,
            },
          }

        case 'enhanced_cta':
          // Highlight CTA with confidence
          return {
            ...product,
            displayTrust: {
              badges: product.trustData.labels,
              explanation: product.trustData.explanation,
              cta: {
                ...product.trustData.cta,
                highlighted: product.trustData.confidence.level === 'High',
              },
            },
          }
      }
    })
  }

  return buildABTestVariant
}

// ============================================================================
// Example 5: Integration with Affiliate Links
// ============================================================================

export async function exampleAffiliateIntegration() {
  /**
   * Scenario: Combine trust data with affiliate links in final response
   * Use case: Full pipeline from recommendation to monetization
   */

  // Assume this comes from previous phases
  const recommendedProducts: RecommendedProduct[] = [
    {
      id: 'prod-1',
      product_name: 'Test Product',
      platform: 'amazon',
      price: 99.99,
      rating: 4.5,
      reviews_count: 100,
      badge: 'best_value',
      is_risky: false,
      score: 0.9,
      reasons: [],
    },
  ]

  // Import buildAffiliateLink from Phase 5
  // import { buildAffiliateLink } from '../../lib/affiliate'

  // Enrich with trust
  const enriched = enrichProductsWithTrustData(recommendedProducts)

  // Add affiliate links (assumed Phase 5 integration)
  const withAffiliate = enriched.map(product => ({
    ...product,
    affiliateUrl: `https://amazon.com/s?k=${encodeURIComponent(product.product_name)}`, // Simplified
  }))

  // Format for full API response
  const finalResponse = withAffiliate.map(product => ({
    id: product.id,
    name: product.product_name,
    platform: product.platform,
    price: product.price,
    rating: product.rating,
    // Trust signals
    trust: {
      labels: product.trustData.labels,
      explanation: product.trustData.explanation,
      confidence: product.trustData.confidence,
      cta: product.trustData.cta,
      riskWarning: product.trustData.riskDisclosure.hasRisk
        ? {
            severity: product.trustData.riskDisclosure.severity,
            message: formatRiskDisclosure(product.trustData.riskDisclosure),
          }
        : null,
    },
    // Monetization
    affiliate: {
      url: product.affiliateUrl,
      platform: product.platform,
    },
  }))

  return finalResponse
}

// ============================================================================
// Example 6: Validation & Error Handling
// ============================================================================

export function exampleErrorHandling() {
  /**
   * Scenario: Graceful degradation when trust data fails
   * Use case: Production resilience
   */

  function safeEnrichProduct(product: RecommendedProduct) {
    try {
      // Check if product is valid for trust layer
      if (!canApplyTrustLayer(product)) {
        console.warn(`Product ${product.id} missing required fields for trust enrichment`)
        return {
          ...product,
          trustData: null,
          trustError: 'Insufficient product data for trust signals',
        }
      }

      // Build context and enrich
      const context = buildTrustContext([product])

      // Validate context
      if (!validateTrustContext(context)) {
        console.error(`Invalid trust context for product ${product.id}`)
        return {
          ...product,
          trustData: null,
          trustError: 'Trust context validation failed',
        }
      }

      // Enrich safely
      const enriched = enrichProductsWithTrustData([product])[0]
      return enriched
    } catch (error) {
      console.error(`Trust enrichment failed for product ${product.id}:`, error)
      return {
        ...product,
        trustData: null,
        trustError: `Enrichment error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  return safeEnrichProduct
}

// ============================================================================
// Example 7: Bulk Processing with Batching
// ============================================================================

export function exampleBatchProcessing() {
  /**
   * Scenario: Process large product lists efficiently
   * Use case: Batch API responses, data export
   */

  async function processBatch(
    products: RecommendedProduct[],
    batchSize: number = 100
  ): Promise<(RecommendedProduct & { trustData: any })[]> {
    const results: (RecommendedProduct & { trustData: any })[] = []

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)

      // Process batch
      const enrichedBatch = enrichProductsWithTrustData(batch)
      results.push(...enrichedBatch)

      // Could add delay to avoid overload
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    return results
  }

  return processBatch
}

// ============================================================================
// Example 8: Custom Threshold Configuration
// ============================================================================

export function exampleCustomThresholds() {
  /**
   * Scenario: Apply different trust standards per use case
   * Use case: Premium vs. budget segments, different markets
   */

  // Conservative thresholds (premium market)
  const premiumThresholds = {
    minRatingForSafe: 4.5,
    minReviewsForReliable: 200,
    minReviewsForChosen: 50,
    ValueScoreThreshold: 0.7,
    mostReviewedPercentile: 90,
    lowRatingThreshold: 4.0,
    lowReviewThreshold: 20,
  }

  // Relaxed thresholds (budget market)
  const budgetThresholds = {
    minRatingForSafe: 3.0,
    minReviewsForReliable: 10,
    minReviewsForChosen: 1,
    ValueScoreThreshold: 0.3,
    mostReviewedPercentile: 50,
    lowRatingThreshold: 2.5,
    lowReviewThreshold: 1,
  }

  // Apply to products
  const products: RecommendedProduct[] = [
    {
      id: 'p1',
      product_name: 'Premium Product',
      platform: 'amazon',
      price: 299,
      rating: 4.7,
      reviews_count: 500,
      badge: 'best_choice',
      is_risky: false,
      score: 0.95,
      reasons: [],
    },
    {
      id: 'p2',
      product_name: 'Budget Product',
      platform: 'shein',
      price: 25,
      rating: 3.5,
      reviews_count: 15,
      badge: 'cheapest',
      is_risky: true,
      score: 0.6,
      reasons: [],
    },
  ]

  const premiumEnriched = enrichProductsWithTrustData(
    [products[0]],
    premiumThresholds
  )
  const budgetEnriched = enrichProductsWithTrustData(
    [products[1]],
    budgetThresholds
  )

  return { premiumEnriched, budgetEnriched }
}

export default {
  exampleBasicAPIResponse,
  exampleProductCardRendering,
  exampleConditionalRendering,
  exampleABTesting,
  exampleAffiliateIntegration,
  exampleErrorHandling,
  exampleBatchProcessing,
  exampleCustomThresholds,
}
