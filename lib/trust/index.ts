/**
 * Trust Layer Orchestration & Integration
 * Combine all 5 trust components into a single enrichment layer
 * Applied AFTER recommendation but BEFORE affiliate linking
 */

import { RecommendedProduct } from '../recommendation/types'
import {
  TrustLayerData,
  TrustContext,
  ProductForTrust,
  TrustThresholds,
} from './types'
import { generateTrustLabels } from './trustLabelsEngine'
import { generateRecommendationExplanation } from './recommendationExplainer'
import { generateConfidenceIndicator } from './confidenceIndicator'
import { generateOptimizedCTA } from './ctaOptimizer'
import { generateRiskDisclosure } from './riskDisclosure'

/**
 * Convert RecommendedProduct to ProductForTrust for calculations
 */
function convertToProductForTrust(product: RecommendedProduct): ProductForTrust {
  return {
    id: product.id,
    title: product.title,
    platform: product.platform,
    price: product.price,
    rating: product.rating,
    reviews_count: product.reviews_count,
    shipping_time_days: product.shipping_time_days,
    is_risky: product.is_risky,
  }
}

/**
 * Default trust configuration
 */
const DEFAULT_TRUST_THRESHOLDS: TrustThresholds = {
  minRatingForSafe: 4.0,
  minReviewsForReliable: 50,
  minReviewsForChosen: 10,
  ValueScoreThreshold: 0.5,
  mostReviewedPercentile: 75,
  lowRatingThreshold: 3.5,
  lowReviewThreshold: 5,
}

/**
 * Build trust context from products list
 */
export function buildTrustContext(
  products: RecommendedProduct[],
  thresholds?: TrustThresholds
): TrustContext {
  const productsForTrust = products.map(convertToProductForTrust)

  return {
    allProducts: productsForTrust,
    thresholds: thresholds || DEFAULT_TRUST_THRESHOLDS,
  }
}

/**
 * Enrich a single product with complete trust data
 */
export function enrichProductWithTrustData(
  product: RecommendedProduct,
  context: TrustContext
): RecommendedProduct & { trustData: TrustLayerData } {
  const productForTrust = convertToProductForTrust(product)

  // Generate all trust components
  const trustLabels = generateTrustLabels(productForTrust, context)
  const explanation = generateRecommendationExplanation(productForTrust, context)
  const confidence = generateConfidenceIndicator(productForTrust)
  const cta = generateOptimizedCTA(productForTrust)
  const riskDisclosure = generateRiskDisclosure(productForTrust, context)

  const trustData: TrustLayerData = {
    labels: trustLabels,
    explanation,
    confidence,
    cta,
    riskDisclosure,
  }

  return {
    ...product,
    trustData,
  }
}

/**
 * Enrich multiple products with trust data
 */
export function enrichProductsWithTrustData(
  products: RecommendedProduct[],
  thresholds?: TrustThresholds
): Array<RecommendedProduct & { trustData: TrustLayerData }> {
  const context = buildTrustContext(products, thresholds)
  return products.map(product => enrichProductWithTrustData(product, context))
}

/**
 * Extract trust data from enriched product (utility for API responses)
 */
export function extractTrustData(
  product: RecommendedProduct & { trustData: TrustLayerData }
): TrustLayerData {
  return product.trustData
}

/**
 * Check if product needs trust warnings
 */
export function needsTrustWarning(
  product: RecommendedProduct,
  context: TrustContext
): boolean {
  const productForTrust = convertToProductForTrust(product)
  const riskDisclosure = generateRiskDisclosure(productForTrust, context)
  return riskDisclosure.hasRisk
}

/**
 * Build minimal trust context (for single product without comparison)
 */
export function buildMinimalTrustContext(
  product: RecommendedProduct,
  allProducts?: RecommendedProduct[]
): TrustContext {
  const productsForTrust = (allProducts || [product]).map(convertToProductForTrust)

  return {
    allProducts: productsForTrust,
    thresholds: DEFAULT_TRUST_THRESHOLDS,
  }
}

/**
 * Verify trust layer can be applied (i.e., product has minimum data)
 */
export function canApplyTrustLayer(product: RecommendedProduct): boolean {
  return !!(product.id && product.product_name && product.platform)
}

/**
 * Disable trust layer without removing data (for A/B testing)
 */
export function withoutTrustData(
  product: RecommendedProduct & { trustData: TrustLayerData }
): RecommendedProduct {
  const { trustData, ...rest } = product
  return rest
}

/**
 * Validate trust context structure
 */
export function validateTrustContext(context: TrustContext): boolean {
  return !!(
    context.allProducts &&
    Array.isArray(context.allProducts) &&
    context.thresholds &&
    context.allProducts.every(p => p.id && p.title)
  )
}

/**
 * Export all trust layer modules for external use
 */
export { generateTrustLabels } from './trustLabelsEngine'
export { generateRecommendationExplanation } from './recommendationExplainer'
export { generateConfidenceIndicator } from './confidenceIndicator'
export { generateOptimizedCTA } from './ctaOptimizer'
export { generateRiskDisclosure, formatRiskDisclosure, isProductRisky } from './riskDisclosure'
export * from './types'
