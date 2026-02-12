/**
 * Confidence Indicator
 * Calculate confidence based on data completeness (not AI certainty)
 * Output: Low / Medium / High (never percentages)
 */

import { ProductForTrust, ConfidenceIndicator, ConfidenceLevel } from './types'

/**
 * Determine data completeness level
 */
export function calculateDataCompleteness(product: ProductForTrust): {
  completeness: number
  missingMetrics: string[]
  hasPrice: boolean
  hasRating: boolean
  hasReviewCount: boolean
  hasDeliveryTime: boolean
  hasShippingCost: boolean
} {
  const metrics = {
    hasPrice: typeof product.price === 'number' && isFinite(product.price),
    hasRating: typeof product.rating === 'number' && isFinite(product.rating),
    hasReviewCount: typeof product.reviews_count === 'number' && product.reviews_count >= 0,
    hasDeliveryTime: typeof product.shipping_days === 'number' && product.shipping_days >= 0,
    hasShippingCost: typeof product.shipping_price === 'number' && isFinite(product.shipping_price),
  }

  const missingMetrics: string[] = []
  if (!metrics.hasPrice) missingMetrics.push('Price')
  if (!metrics.hasRating) missingMetrics.push('Rating')
  if (!metrics.hasReviewCount) missingMetrics.push('Review count')
  if (!metrics.hasDeliveryTime) missingMetrics.push('Delivery time')
  if (!metrics.hasShippingCost) missingMetrics.push('Shipping cost')

  const availableCount = Object.values(metrics).filter(Boolean).length
  const completeness = (availableCount / 5) * 100

  return {
    completeness,
    missingMetrics,
    ...metrics,
  }
}

/**
 * Determine confidence level based on data completeness
 * Logic:
 *  - High: 4-5 key metrics available (price, rating, reviews, delivery)
 *  - Medium: 2-3 key metrics available
 *  - Low: 0-1 key metrics available
 */
export function determineConfidenceLevel(completeness: {
  hasPrice: boolean
  hasRating: boolean
  hasReviewCount: boolean
  hasDeliveryTime: boolean
  hasShippingCost: boolean
}): ConfidenceLevel {
  const keyMetricsCount = [
    completeness.hasPrice,
    completeness.hasRating,
    completeness.hasReviewCount,
    completeness.hasDeliveryTime,
  ].filter(Boolean).length

  if (keyMetricsCount >= 4) {
    return 'High'
  } else if (keyMetricsCount >= 2) {
    return 'Medium'
  } else {
    return 'Low'
  }
}

/**
 * Generate confidence indicator
 */
export function generateConfidenceIndicator(product: ProductForTrust): ConfidenceIndicator {
  const completeness = calculateDataCompleteness(product)
  const level = determineConfidenceLevel({
    hasPrice: completeness.hasPrice,
    hasRating: completeness.hasRating,
    hasReviewCount: completeness.hasReviewCount,
    hasDeliveryTime: completeness.hasDeliveryTime,
    hasShippingCost: completeness.hasShippingCost,
  })

  const reasonMap: Record<ConfidenceLevel, string> = {
    High: 'Complete product information available',
    Medium: `Missing: ${completeness.missingMetrics.join(', ')}`,
    Low: `Limited information available – ${completeness.missingMetrics.slice(0, 2).join(', ')} missing`,
  }

  return {
    level,
    completeness: Math.round(completeness.completeness),
    missingMetrics: completeness.missingMetrics,
    reason: reasonMap[level],
  }
}

/**
 * Get confidence label for UI display
 */
export function getConfidenceLabel(level: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    High: '✓ High confidence',
    Medium: '≈ Medium confidence',
    Low: '⚠ Low confidence – limited data',
  }
  return labels[level]
}

/**
 * Check if product has sufficient data for trust calculations
 */
export function hasSufficientData(product: ProductForTrust, minimumLevel: ConfidenceLevel = 'Medium'): boolean {
  const indicator = generateConfidenceIndicator(product)

  const levelRanking: Record<ConfidenceLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
  }

  return levelRanking[indicator.level] >= levelRanking[minimumLevel]
}
