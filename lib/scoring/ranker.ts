/**
 * Phase 3: Product Ranking & Categorization Logic
 * Identifies "winners" in different categories from scored products
 * 100% algorithmic, deterministic, no randomness
 */

import { Product } from '@/lib/types/product'

/**
 * Type definition for product badges
 */
export type ProductBadge = 'best_choice' | 'best_value' | 'fastest' | 'cheapest'

/**
 * ScoredProduct type (as used in Phase 2)
 */
interface ScoredProduct extends Product {
  score: number
  confidence: number
}

/**
 * Configuration for ranking thresholds
 */
interface RankerConfig {
  bestChoiceMinRating: number
  bestChoiceMinReviews: number
  cheapestMinRating: number
}

const DEFAULT_CONFIG: RankerConfig = {
  bestChoiceMinRating: 4.0,
  bestChoiceMinReviews: 50,
  cheapestMinRating: 3.8,
}

/**
 * Main ranking function
 * Input: Array of ScoredProduct (from Phase 2)
 * Output: Same array with badges assigned to category winners
 *
 * Priority: Best Choice > Best Value > Fastest > Cheapest
 * Each product can have at most one badge
 */
export function rankProducts(
  products: ScoredProduct[],
  config: RankerConfig = DEFAULT_CONFIG
): ScoredProduct[] {
  if (products.length === 0) return []

  // Track which products have been assigned badges
  const assignedBadges = new Set<string>()

  // Create result array with badges
  const rankedProducts = products.map(p => ({ ...p }))

  // Step 1: Find and assign Best Choice (highest priority)
  const bestChoice = findBestChoice(rankedProducts, config)
  if (bestChoice) {
    const idx = rankedProducts.findIndex(p => p.id === bestChoice.id)
    if (idx !== -1) {
      rankedProducts[idx].badge = 'best_choice'
      assignedBadges.add(bestChoice.id)
    }
  }

  // Step 2: Find and assign Best Value
  const bestValue = findBestValue(rankedProducts, assignedBadges)
  if (bestValue) {
    const idx = rankedProducts.findIndex(p => p.id === bestValue.id)
    if (idx !== -1) {
      rankedProducts[idx].badge = 'best_value'
      assignedBadges.add(bestValue.id)
    }
  }

  // Step 3: Find and assign Fastest Delivery
  const fastest = findFastest(rankedProducts, assignedBadges)
  if (fastest) {
    const idx = rankedProducts.findIndex(p => p.id === fastest.id)
    if (idx !== -1) {
      rankedProducts[idx].badge = 'fastest'
      assignedBadges.add(fastest.id)
    }
  }

  // Step 4: Find and assign Cheapest
  const cheapest = findCheapest(rankedProducts, config, assignedBadges)
  if (cheapest) {
    const idx = rankedProducts.findIndex(p => p.id === cheapest.id)
    if (idx !== -1) {
      rankedProducts[idx].badge = 'cheapest'
      assignedBadges.add(cheapest.id)
    }
  }

  return rankedProducts
}

/**
 * Category 1: Best Choice (الأفضل إجمالاً)
 * Logic: Highest total_score (score field)
 * Constraints:
 *   - rating > 4.0
 *   - reviews_count > threshold (default 50)
 */
function findBestChoice(
  products: ScoredProduct[],
  config: RankerConfig
): ScoredProduct | null {
  const eligible = products.filter(p => {
    const rating = p.rating ?? 0
    const reviewsCount = p.reviews_count ?? 0
    return rating > config.bestChoiceMinRating && reviewsCount > config.bestChoiceMinReviews
  })

  if (eligible.length === 0) return null

  // Return product with highest score
  return eligible.reduce((best, current) => (current.score > best.score ? current : best))
}

/**
 * Category 2: Best Value (الأفضل قيمة مقابل السعر)
 * Logic: Best ratio of rating to price
 * Formula: value_score = (rating * log(reviews_count)) / price
 * Goal: Highlight products with high quality at mid-to-low price
 */
function findBestValue(
  products: ScoredProduct[],
  assigned: Set<string>
): ScoredProduct | null {
  const candidates = products.filter(p => !assigned.has(p.id))

  if (candidates.length === 0) return null

  // Calculate value_score for each candidate
  const scored = candidates
    .map(p => ({
      product: p,
      valueScore: calculateValueScore(p),
    }))
    .filter(p => p.valueScore > 0) // Only include products with positive value

  if (scored.length === 0) return null

  // Return product with highest value_score
  return scored.reduce((best, current) =>
    current.valueScore > best.valueScore ? current : best
  ).product
}

/**
 * Calculate value score for a product
 * value_score = (rating * log(reviews_count)) / price
 */
function calculateValueScore(product: ScoredProduct): number {
  const rating = product.rating ?? 0
  const reviewsCount = product.reviews_count ?? 1
  const price = product.price ?? 1

  // Avoid division by zero and invalid prices
  if (rating <= 0 || price <= 0) return 0

  // Use natural logarithm; if reviews_count is 0 or 1, log(1) = 0, so we add 1
  const logReviews = Math.log(Math.max(1, reviewsCount))

  return (rating * logReviews) / price
}

/**
 * Category 3: Fastest Delivery (الأسرع وصولاً)
 * Logic: Minimum shipping_time_days
 * Tie-breaker: If multiple products have same fastest time, pick highest score
 */
function findFastest(
  products: ScoredProduct[],
  assigned: Set<string>
): ScoredProduct | null {
  const candidates = products.filter(p => !assigned.has(p.id))

  if (candidates.length === 0) return null

  // Filter products with valid shipping time
  const withShipping = candidates.filter(
    p => typeof p.shipping_time_days === 'number' && p.shipping_time_days > 0
  )

  if (withShipping.length === 0) return null

  // Find minimum shipping time
  const minTime = Math.min(...withShipping.map(p => p.shipping_time_days!))

  // Get all products with minimum shipping time
  const fastest = withShipping.filter(p => p.shipping_time_days === minTime)

  if (fastest.length === 1) return fastest[0]

  // Tie-breaker: highest score
  return fastest.reduce((best, current) => (current.score > best.score ? current : best))
}

/**
 * Category 4: Cheapest (الأرخص بجودة مقبولة)
 * Logic: Minimum price
 * Constraint: rating >= 3.8 (minimum quality bar)
 * Note: Do not assign badge if no product meets quality constraint
 */
function findCheapest(
  products: ScoredProduct[],
  config: RankerConfig,
  assigned: Set<string>
): ScoredProduct | null {
  const candidates = products.filter(p => !assigned.has(p.id))

  if (candidates.length === 0) return null

  // Filter by quality constraint
  const qualified = candidates.filter(p => {
    const rating = p.rating ?? 0
    return rating >= config.cheapestMinRating
  })

  if (qualified.length === 0) return null

  // Return product with minimum price
  return qualified.reduce((cheapest, current) =>
    current.price < cheapest.price ? current : cheapest
  )
}
