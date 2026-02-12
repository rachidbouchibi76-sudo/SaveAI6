/**
 * Recommendation service: applies configuration-driven filtering and tagging
 * Takes input from Phase 2 (Scoring) and Phase 3 (Ranking)
 * Outputs products with verification status, trust tags, and risk flags
 */

import { Product } from '@/lib/types/product'
import { RecommendationConfig } from '@/config/recommendation'

export interface RecommendedProduct extends Product {
  isRecommended: boolean
  reasoning_tags: string[]
  is_risky: boolean
  risk_reasons: string[]
}

/**
 * Get applicable thresholds for a product's category
 * Falls back to global defaults if category-specific not found
 */
function getThresholdsForCategory(category?: string): {
  minRating: number
  minReviews: number
  priceOutlierThreshold: number
} {
  if (!category) {
    return {
      minRating: RecommendationConfig.global.minRating,
      minReviews: RecommendationConfig.global.minReviews,
      priceOutlierThreshold: RecommendationConfig.global.priceOutlierThreshold,
    }
  }

  const categoryConfig = (RecommendationConfig.categorySpecific as Record<string, any>)[category]

  if (!categoryConfig) {
    return {
      minRating: RecommendationConfig.global.minRating,
      minReviews: RecommendationConfig.global.minReviews,
      priceOutlierThreshold: RecommendationConfig.global.priceOutlierThreshold,
    }
  }

  return {
    minRating: categoryConfig.minRating ?? RecommendationConfig.global.minRating,
    minReviews: categoryConfig.minReviews ?? RecommendationConfig.global.minReviews,
    priceOutlierThreshold: categoryConfig.priceOutlierThreshold ?? RecommendationConfig.global.priceOutlierThreshold,
  }
}

/**
 * Calculate the median price from products (used for outlier detection)
 */
function calculateMedianPrice(products: Product[]): number {
  const prices = products
    .map(p => p.price)
    .filter((p): p is number => typeof p === 'number' && isFinite(p))
    .sort((a, b) => a - b)

  if (prices.length === 0) return 0

  const mid = Math.floor(prices.length / 2)
  return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2
}

/**
 * Check if a product price is dangerously low (potential scam)
 */
function isPriceSuspicious(price: number | undefined, medianPrice: number, threshold: number): boolean {
  if (!price || typeof price !== 'number' || !isFinite(price)) return false
  if (medianPrice === 0) return false

  const suspiciousThreshold = medianPrice * threshold
  return price < suspiciousThreshold
}

/**
 * Generate trust reasoning tags based on product signals
 */
function generateReasoningTags(product: Product): string[] {
  const tags: string[] = []
  const { highReviewCountThreshold, mediumReviewCountThreshold, fastShippingThresholdDays } = RecommendationConfig.trustSignals

  // High review counts = trust signal
  if (product.reviews_count && product.reviews_count > highReviewCountThreshold) {
    tags.push('Top Rated by Thousands')
  } else if (product.reviews_count && product.reviews_count > mediumReviewCountThreshold) {
    tags.push('Popular with Buyers')
  }

  // Rating signals
  if (product.rating && product.rating >= 4.7) {
    tags.push('Exceptional Rating')
  } else if (product.rating && product.rating >= 4.3) {
    tags.push('Highly Trusted')
  }

  // Shipping signals
  if (product.shipping_days && product.shipping_days <= fastShippingThresholdDays) {
    tags.push('Fast Shipping')
  }

  // Free shipping is always positive
  if (product.shipping_price === 0) {
    tags.push('Free Shipping')
  }

  // Brand information if available
  if (product.brand) {
    tags.push(`Brand: ${product.brand}`)
  }

  // Badge from Phase 3 ranking
  if (product.badge) {
    const badgeLabels: Record<string, string> = {
      best_choice: 'Category Winner: Best Choice',
      best_value: 'Category Winner: Best Value',
      fastest: 'Category Winner: Fastest',
      cheapest: 'Category Winner: Cheapest',
    }
    if (badgeLabels[product.badge]) {
      tags.push(badgeLabels[product.badge])
    }
  }

  return tags
}

/**
 * Main recommendation service
 * Takes scored & ranked products and applies guardrail logic
 * Returns products with verification status and reasoning
 */
export function recommendProducts(products: Product[]): RecommendedProduct[] {
  // Step 1: Calculate global price median for outlier detection
  const medianPrice = calculateMedianPrice(products)

  // Step 2: Apply dynamic filtering and tagging
  const recommended: RecommendedProduct[] = products.map(product => {
    const thresholds = getThresholdsForCategory(product.category)
    const reasoningTags = generateReasoningTags(product)
    const riskReasons: string[] = []
    let isRisky = false
    let isRecommended = true

    // Rule 1: Check rating threshold
    const productRating = product.rating ?? 0
    if (productRating < thresholds.minRating) {
      isRisky = true
      isRecommended = false
      riskReasons.push(`Rating ${productRating.toFixed(1)} below threshold of ${thresholds.minRating}`)
    }

    // Rule 2: Check review count threshold
    const productReviews = product.reviews_count ?? 0
    if (productReviews < thresholds.minReviews) {
      isRisky = true
      isRecommended = false
      riskReasons.push(`Only ${productReviews} reviews; minimum ${thresholds.minReviews} required`)
    }

    // Rule 3: Anti-scam price check
    if (isPriceSuspicious(product.price, medianPrice, thresholds.priceOutlierThreshold)) {
      isRisky = true
      isRecommended = false
      const suspiciousPrice = (medianPrice * thresholds.priceOutlierThreshold).toFixed(2)
      riskReasons.push(`Price $${product.price} is suspiciously low (below $${suspiciousPrice})`)
    }

    // Rule 4: Platform reliability check (if available)
    if (product.platform) {
      const trustedPlatforms = ['amazon', 'ebay', 'walmart', 'best-buy']
      const knownUnsafePlatforms = ['unknown', 'third-party', 'marketplace']

      if (knownUnsafePlatforms.some(p => product.platform!.toLowerCase().includes(p))) {
        // For untrusted platforms, be stricter
        if (productRating < thresholds.minRating + 0.2) {
          isRisky = true
          isRecommended = false
          riskReasons.push('Untrusted seller platform - higher standards applied')
        }
      }

      if (trustedPlatforms.some(p => product.platform!.toLowerCase().includes(p))) {
        // Trusted platforms get slight leniency (shown in tags instead)
        if (!reasoningTags.includes('Trusted Seller Platform')) {
          reasoningTags.push('Trusted Seller Platform')
        }
      }
    }

    return {
      ...product,
      isRecommended,
      is_risky: isRisky,
      reasoning_tags: reasoningTags,
      risk_reasons: riskReasons,
    }
  })

  return recommended
}

/**
 * Filter to get only verified products
 */
export function getVerifiedOnly(recommended: RecommendedProduct[]): RecommendedProduct[] {
  return recommended.filter(p => p.isRecommended && !p.is_risky)
}

/**
 * Get all products with warnings for risky ones
 */
export function getAllWithWarnings(recommended: RecommendedProduct[]): RecommendedProduct[] {
  return recommended
}

/**
 * Get statistics about recommendation results
 */
export function getRecommendationStats(recommended: RecommendedProduct[]) {
  const total = recommended.length
  const verified = recommended.filter(p => p.isRecommended).length
  const risky = recommended.filter(p => p.is_risky).length

  return {
    total,
    verified,
    risky,
    verificationRate: total > 0 ? (verified / total) * 100 : 0,
    riskRate: total > 0 ? (risky / total) * 100 : 0,
  }
}

export default recommendProducts
