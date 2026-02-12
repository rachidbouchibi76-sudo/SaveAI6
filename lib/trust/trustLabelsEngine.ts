/**
 * Trust Labels Engine
 * Generate trust labels based on structured product data
 * Pure function - no side effects
 */

import {
  TrustLabel,
  TrustLabelDisplay,
  ProductForTrust,
  TrustContext,
  TrustThresholds,
} from './types'

const DEFAULT_THRESHOLDS: TrustThresholds = {
  minRatingForSafe: 4.0,
  minReviewsForReliable: 50,
  minReviewsForChosen: 10,
  ValueScoreThreshold: 0.5,
  mostReviewedPercentile: 75,
  lowRatingThreshold: 3.5,
  lowReviewThreshold: 5,
}

/**
 * Calculate value score (balanced price + quality + trust)
 * Used for "Best Value" label
 */
function calculateValueScore(product: ProductForTrust, allProducts: ProductForTrust[]): number {
  if (!product.price || !product.rating || !product.reviews_count) return -1

  // Normalize price (lower is better)
  const prices = allProducts
    .map(p => p.price)
    .filter((p): p is number => typeof p === 'number' && isFinite(p))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceScore = maxPrice === minPrice ? 0.5 : (maxPrice - product.price) / (maxPrice - minPrice)

  // Normalize rating (higher is better)
  const ratingScore = product.rating / 5

  // Normalize reviews (log scale to prevent outliers)
  const maxReviews = Math.max(...allProducts.map(p => p.reviews_count || 0))
  const reviewScore = maxReviews > 0 ? Math.log10(1 + product.reviews_count) / Math.log10(1 + maxReviews) : 0

  // Weighted calculation
  const valueScore = priceScore * 0.4 + ratingScore * 0.4 + reviewScore * 0.2

  return valueScore
}

/**
 * Get percentile rank of a product among all products
 */
function getPercentileRank(value: number, allValues: number[]): number {
  const sorted = allValues.sort((a, b) => a - b)
  const index = sorted.findIndex(v => v >= value)
  return (index / sorted.length) * 100
}

/**
 * Generate trust labels for a product
 */
export function generateTrustLabels(
  product: ProductForTrust,
  context: TrustContext
): TrustLabelDisplay[] {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...context.thresholds }
  const labels: TrustLabelDisplay[] = []

  // Label 1: Best Value
  if (product.price && product.rating && product.reviews_count) {
    const valueScore = calculateValueScore(product, context.allProducts)
    if (valueScore >= thresholds.ValueScoreThreshold) {
      labels.push({
        label: 'best_value',
        displayText: 'Best Value',
        explanation: 'Balanced price, good rating, and trusted by many buyers',
        priority: 1,
      })
    }
  }

  // Label 2: Cheapest Safe Option
  if (product.price && product.rating && product.reviews_count) {
    const cheapestWithQuality = context.allProducts.find(
      p =>
        p.price &&
        p.rating &&
        p.reviews_count &&
        p.price === Math.min(...context.allProducts.map(pp => pp.price || Infinity)) &&
        p.rating >= thresholds.minRatingForSafe &&
        p.reviews_count >= thresholds.minReviewsForChosen
    )

    if (
      cheapestWithQuality &&
      cheapestWithQuality.id === product.id &&
      product.rating >= thresholds.minRatingForSafe &&
      product.reviews_count >= thresholds.minReviewsForChosen
    ) {
      labels.push({
        label: 'cheapest_safe',
        displayText: 'Cheapest Safe Option',
        explanation: 'Lowest price with reliable quality and good reviews',
        priority: 2,
      })
    }
  }

  // Label 3: Long-Term Choice
  if (product.rating && product.reviews_count) {
    const highestRated = Math.max(...context.allProducts.map(p => p.rating || 0))
    if (
      product.rating >= highestRated * 0.95 && // Top 5% rated
      product.reviews_count >= thresholds.minReviewsForReliable
    ) {
      labels.push({
        label: 'long_term_choice',
        displayText: 'Long-Term Choice',
        explanation: 'Highest quality – excellent for long-term use',
        priority: 3,
      })
    }
  }

  // Label 4: Fastest Delivery
  if (product.shipping_days) {
    const fastestDelivery = Math.min(...context.allProducts.map(p => p.shipping_days || Infinity))
    if (product.shipping_days === fastestDelivery) {
      labels.push({
        label: 'fastest_delivery',
        displayText: 'Fastest Delivery',
        explanation: `Ships in ${product.shipping_days} day${product.shipping_days !== 1 ? 's' : ''}`,
        priority: 4,
      })
    }
  }

  // Label 5: Most Reviewed
  if (product.reviews_count) {
    const reviewCounts = context.allProducts.map(p => p.reviews_count || 0)
    const percentile = getPercentileRank(product.reviews_count, reviewCounts)
    if (percentile >= thresholds.mostReviewedPercentile) {
      labels.push({
        label: 'most_reviewed',
        displayText: 'Most Reviewed',
        explanation: `${product.reviews_count} customer reviews – trusted by many`,
        priority: 5,
      })
    }
  }

  // Label 6: Higher Risk – Lower Price (warning label)
  if (product.price && product.rating && product.reviews_count) {
    if (
      product.rating < thresholds.lowRatingThreshold ||
      product.reviews_count < thresholds.lowReviewThreshold
    ) {
      const isLowestPrice =
        product.price === Math.min(...context.allProducts.map(p => p.price || Infinity))
      if (isLowestPrice) {
        labels.push({
          label: 'higher_risk_lower_price',
          displayText: 'Higher Risk – Lower Price',
          explanation: 'Cheapest option but fewer reviews or lower rating',
          priority: 6,
        })
      }
    }
  }

  return labels
}

/**
 * Get primary label for display (highest priority)
 */
export function getPrimaryLabel(labels: TrustLabelDisplay[]): TrustLabelDisplay | null {
  if (labels.length === 0) return null
  return labels.reduce((prev, curr) => (curr.priority < prev.priority ? curr : prev))
}

/**
 * Get all labels sorted by priority
 */
export function getSortedLabels(labels: TrustLabelDisplay[]): TrustLabelDisplay[] {
  return [...labels].sort((a, b) => a.priority - b.priority)
}

/**
 * Filter labels by type
 */
export function filterLabels(labels: TrustLabelDisplay[], labelType: TrustLabel): TrustLabelDisplay[] {
  return labels.filter(l => l.label === labelType)
}

/**
 * Check if product has warning labels
 */
export function hasWarningLabels(labels: TrustLabelDisplay[]): boolean {
  return labels.some(l => l.label === 'higher_risk_lower_price')
}
