/**
 * Phase 4: Smart Guardrails & Recommendation Logic
 * Quality filters and trust verification for product recommendations
 * Flags risky products instead of deleting them for transparency
 */

import { Product } from '@/lib/types/product'

/**
 * Category-specific thresholds for recommendation rules
 */
export interface CategoryThresholds {
  minRating: number // e.g., 4.0
  minReviewCount: number // e.g., 10 for electronics
  priceOutlierFactor: number // e.g., 0.4 (40% of median = outlier)
}

/**
 * Configuration for guardrail system
 */
export interface GuardrailConfig {
  // Default global thresholds
  global: CategoryThresholds

  // Category-specific overrides
  categories?: Record<string, CategoryThresholds>

  // Platform-specific strictness adjustments
  stricterPlatforms?: string[] // platforms requiring higher standards
  trustedPlatforms?: string[] // platforms with relaxed standards
}

/**
 * Platform reliability levels
 */
type PlatformTrust = 'trusted' | 'standard' | 'new'

/**
 * Internal product with guardrail evaluation
 */
interface GuardraildProduct extends Product {
  isRecommended: boolean
  reasoning_tags: string[]
  is_risky: boolean
  risk_reasons: string[]
}

/**
 * Default guardrail configuration
 */
const DEFAULT_CONFIG: GuardrailConfig = {
  global: {
    minRating: 4.0,
    minReviewCount: 10,
    priceOutlierFactor: 0.4, // prices < 40% of median are suspicious
  },
  categories: {
    // Electronics: higher bars (more reviews needed, higher rating)
    electronics: {
      minRating: 4.1,
      minReviewCount: 25,
      priceOutlierFactor: 0.35,
    },
    // Fashion/apparel: more lenient (fewer reviews typical)
    fashion: {
      minRating: 3.9,
      minReviewCount: 5,
      priceOutlierFactor: 0.4,
    },
    // Home & garden: moderate
    home: {
      minRating: 4.0,
      minReviewCount: 15,
      priceOutlierFactor: 0.4,
    },
    // Books/media: lenient
    media: {
      minRating: 3.8,
      minReviewCount: 3,
      priceOutlierFactor: 0.45,
    },
  },

  // Platforms with stricter requirements
  stricterPlatforms: ['unknown', 'third-party'],

  // Platforms with relaxed requirements
  trustedPlatforms: ['amazon', 'ebay', 'walmart'],
}

/**
 * Get thresholds for a product based on category and platform
 */
function getThresholdsForProduct(
  product: Product,
  config: GuardrailConfig
): CategoryThresholds {
  let thresholds = { ...config.global }

  // Apply category-specific override
  if (product.category && config.categories && config.categories[product.category.toLowerCase()]) {
    thresholds = { ...thresholds, ...config.categories[product.category.toLowerCase()] }
  }

  // Adjust based on platform trust level
  const platformTrust = getPlatformTrust(product.platform, config)
  if (platformTrust === 'new') {
    // Stricter for new/unknown platforms
    thresholds.minRating += 0.2
    thresholds.minReviewCount = Math.max(thresholds.minReviewCount, 20)
  } else if (platformTrust === 'trusted') {
    // Slightly more lenient for trusted platforms
    thresholds.minRating = Math.max(3.5, thresholds.minRating - 0.1)
    thresholds.minReviewCount = Math.max(1, thresholds.minReviewCount - 5)
  }

  return thresholds
}

/**
 * Determine platform trust level
 */
function getPlatformTrust(platform: string, config: GuardrailConfig): PlatformTrust {
  const lowerPlatform = platform.toLowerCase()

  if (config.trustedPlatforms?.some(p => lowerPlatform.includes(p.toLowerCase()))) {
    return 'trusted'
  }

  if (config.stricterPlatforms?.some(p => lowerPlatform.includes(p.toLowerCase()))) {
    return 'new'
  }

  return 'standard'
}

/**
 * Rule 1: Minimum Quality Floor
 * Exclude products with rating < 4.0 (or category threshold)
 * Unless it's the only option, then mark as risky
 */
function checkMinimumQuality(
  product: Product,
  thresholds: CategoryThresholds,
  isOnlyOption: boolean
): { passed: boolean; tag: string | null; riskReason: string | null } {
  const rating = product.rating ?? 0

  if (rating >= thresholds.minRating) {
    return { passed: true, tag: 'High Rating', riskReason: null }
  }

  // Failed check
  const reason = `Rating ${rating.toFixed(1)}/5 (below ${thresholds.minRating} threshold)`

  if (isOnlyOption) {
    // Mark as risky instead of rejecting
    return { passed: false, tag: null, riskReason: reason }
  }

  return { passed: false, tag: null, riskReason: reason }
}

/**
 * Rule 2: Social Proof Threshold
 * Exclude products with insufficient reviews
 */
function checkSocialProof(
  product: Product,
  thresholds: CategoryThresholds,
  isOnlyOption: boolean
): { passed: boolean; tag: string | null; riskReason: string | null } {
  const reviewCount = product.reviews_count ?? 0

  if (reviewCount >= thresholds.minReviewCount) {
    return { passed: true, tag: 'Trusted Seller', riskReason: null }
  }

  // Failed check
  const reason = `Only ${reviewCount} review(s) (below ${thresholds.minReviewCount} threshold)`

  if (isOnlyOption) {
    return { passed: false, tag: null, riskReason: reason }
  }

  return { passed: false, tag: null, riskReason: reason }
}

/**
 * Rule 3: Outlier Price Detection (Anti-Scam)
 * Identify and flag products with suspiciously low prices
 */
function checkPriceOutlier(
  product: Product,
  allProducts: Product[],
  config: GuardrailConfig,
  thresholds: CategoryThresholds
): { passed: boolean; tag: string | null; riskReason: string | null } {
  const price = product.price ?? 0

  // Need at least 3 products to calculate median
  if (allProducts.length < 3) {
    return { passed: true, tag: null, riskReason: null }
  }

  // Calculate median price
  const prices = allProducts
    .map(p => p.price ?? 0)
    .filter(p => p > 0)
    .sort((a, b) => a - b)

  if (prices.length < 2) {
    return { passed: true, tag: null, riskReason: null }
  }

  const medianPrice = prices.length % 2 === 0 ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2 : prices[Math.floor(prices.length / 2)]

  if (medianPrice === 0) {
    return { passed: true, tag: null, riskReason: null }
  }

  // Check if price is suspiciously low
  const outlierId = thresholds.priceOutlierFactor * medianPrice
  if (price < outlierId) {
    return {
      passed: false,
      tag: null,
      riskReason: `Price $${price} is 60%+ below median ($${medianPrice.toFixed(2)}) - possible scam/error`,
    }
  }

  // Price is reasonable relative to median
  if (price <= medianPrice * 0.85) {
    return { passed: true, tag: 'Good Deal', riskReason: null }
  }

  return { passed: true, tag: null, riskReason: null }
}

/**
 * Rule 4: Platform Reliability Logic
 * Increase strictness for new/unreliable platforms
 */
function checkPlatformReliability(
  product: Product,
  config: GuardrailConfig
): { passed: boolean; tag: string | null; riskReason: string | null } {
  const platformTrust = getPlatformTrust(product.platform, config)

  if (platformTrust === 'trusted') {
    return { passed: true, tag: 'Trusted Seller', riskReason: null }
  }

  if (platformTrust === 'new') {
    return { passed: false, tag: null, riskReason: `Platform "${product.platform}" is not in trusted seller list` }
  }

  return { passed: true, tag: null, riskReason: null }
}

/**
 * Additional positive signals to add as reasoning tags
 */
function gatherPositiveSignals(product: Product): string[] {
  const tags: string[] = []

  // Fast shipping
  if (typeof product.shipping_time_days === 'number') {
    if (product.shipping_time_days <= 2) {
      tags.push('Express Shipping')
    } else if (product.shipping_time_days <= 5) {
      tags.push('Fast Shipping')
    }
  }

  // Free shipping
  if (product.shipping_price === 0) {
    tags.push('Free Shipping')
  }

  // Has description/details
  if (product.description && product.description.length > 50) {
    tags.push('Detailed Description')
  }

  // Has brand
  if (product.brand) {
    tags.push(`Brand: ${product.brand}`)
  }

  // Has badge from Phase 3
  if (product.badge) {
    const badgeLabels = {
      best_choice: 'Category Winner',
      best_value: 'Best Value',
      fastest: 'Fastest Delivery',
      cheapest: 'Most Affordable',
    }
    tags.push(badgeLabels[product.badge])
  }

  return tags
}

/**
 * Main guardrail function
 * Applies quality filters and trust verification
 * Returns all products but with flags for risky ones
 */
export function applyGuardrails(
  products: Product[],
  config: GuardrailConfig = DEFAULT_CONFIG
): GuardraildProduct[] {
  if (products.length === 0) return []

  // Apply guardrails to each product
  const guarded = products.map(product => {
    const thresholds = getThresholdsForProduct(product, config)
    const isOnlyOption = products.length === 1

    // Evaluate each rule
    const qualityCheck = checkMinimumQuality(product, thresholds, isOnlyOption)
    const proofCheck = checkSocialProof(product, thresholds, isOnlyOption)
    const priceCheck = checkPriceOutlier(product, products, config, thresholds)
    const platformCheck = checkPlatformReliability(product, config)

    // Collect risk reasons
    const riskReasons: string[] = []
    if (qualityCheck.riskReason) riskReasons.push(qualityCheck.riskReason)
    if (proofCheck.riskReason) riskReasons.push(proofCheck.riskReason)
    if (priceCheck.riskReason) riskReasons.push(priceCheck.riskReason)
    if (platformCheck.riskReason) riskReasons.push(platformCheck.riskReason)

    // Product is recommended if all checks pass (or only option)
    const allChecksPassed = qualityCheck.passed && proofCheck.passed && priceCheck.passed && platformCheck.passed
    const isRecommended = allChecksPassed || isOnlyOption

    // Gather positive tags (even for risky products)
    const positiveTags: string[] = []
    if (qualityCheck.tag) positiveTags.push(qualityCheck.tag)
    if (proofCheck.tag) positiveTags.push(proofCheck.tag)
    if (priceCheck.tag) positiveTags.push(priceCheck.tag)
    if (platformCheck.tag) positiveTags.push(platformCheck.tag)

    // Add additional positive signals
    const additionalTags = gatherPositiveSignals(product)
    positiveTags.push(...additionalTags)

    // Remove duplicates
    const uniqueTags = [...new Set(positiveTags)]

    return {
      ...product,
      isRecommended,
      reasoning_tags: uniqueTags,
      is_risky: riskReasons.length > 0,
      risk_reasons: riskReasons,
    }
  })

  return guarded
}

/**
 * Filter products to only recommended ones
 * Useful when you want a strict "safe" list
 */
export function getRecommendedOnly(guarded: GuardraildProduct[]): GuardraildProduct[] {
  return guarded.filter(p => p.isRecommended && !p.is_risky)
}

/**
 * Get all products but with risky ones flagged
 * Useful for showing all options with warnings
 */
export function getAllWithWarnings(guarded: GuardraildProduct[]): GuardraildProduct[] {
  return guarded
}
