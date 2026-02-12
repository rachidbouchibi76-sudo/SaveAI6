/**
 * Risk Disclosure Microcopy
 * Generate short risk disclaimers when a product doesn't meet all quality standards
 * Show only when applicable, never always
 */

import { RiskDisclosure, ProductForTrust, TrustContext, TrustThresholds } from './types'

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
 * Identify specific risks in a product
 */
export function identifyRisks(
  product: ProductForTrust,
  context: TrustContext
): {
  warnings: string[]
  severity: 'low' | 'medium' | 'high'
} {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...context.thresholds }
  const warnings: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'

  // Risk 1: Low rating
  if (product.rating && product.rating < thresholds.lowRatingThreshold) {
    warnings.push(`Lower rating than average (${product.rating.toFixed(1)}/5)`)
    severity = 'medium'
  }

  // Risk 2: Few reviews (low social proof)
  if (product.reviews_count && product.reviews_count < thresholds.lowReviewThreshold) {
    warnings.push(`Fewer reviews than average (only ${product.reviews_count} reviews)`)
    severity = 'medium'
  }

  // Risk 3: Long delivery time
  if (product.shipping_days) {
    const avgShippingDays =
      context.allProducts.reduce((sum, p) => sum + (p.shipping_days || 0), 0) /
      context.allProducts.length

    if (product.shipping_days > avgShippingDays + 5) {
      warnings.push(`Longer delivery time (${product.shipping_days} days vs typical ${Math.round(avgShippingDays)})`)
      severity = 'low'
    }
  }

  // Risk 4: High price with lower quality
  if (product.price && product.rating && product.reviews_count) {
    const avgPrice =
      context.allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / context.allProducts.length
    const avgRating =
      context.allProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / context.allProducts.length

    if (
      product.price > avgPrice * 1.3 && // 30% more expensive
      product.rating < avgRating
    ) {
      warnings.push(`Higher price without better quality`)
      severity = 'low'
    }
  }

  // Risk 5: Price is extremely low (potential scam indicator)
  if (product.price) {
    const prices = context.allProducts
      .map(p => p.price)
      .filter((p): p is number => typeof p === 'number' && p > 0)
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
      if (product.price < avgPrice * 0.3) {
        // 70% cheaper
        warnings.push(`Unusually low price – verify authenticity before buying`)
        severity = 'high'
      }
    }
  }

  return { warnings, severity }
}

/**
 * Determine if a product needs risk disclosure
 */
export function needsRiskDisclosure(
  product: ProductForTrust,
  context: TrustContext
): boolean {
  const { warnings } = identifyRisks(product, context)
  return warnings.length > 0
}

/**
 * Generate mitigation or explanation for risks
 */
function generateMitigation(
  product: ProductForTrust,
  context: TrustContext
): string | undefined {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...context.thresholds }

  // If low price, suggest as budget option
  if (product.price) {
    const avgPrice =
      context.allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / context.allProducts.length
    if (product.price < avgPrice * 0.7) {
      return 'Consider as a budget option – good for less demanding use cases'
    }
  }

  // If few reviews but decent rating, suggest as emerging option
  if (
    product.reviews_count &&
    product.reviews_count < thresholds.lowReviewThreshold &&
    product.rating &&
    product.rating >= thresholds.minRatingForSafe
  ) {
    return 'Newer product with positive early feedback – low risk if budget allows'
  }

  // If low rating but affordable, suggest careful consideration
  if (
    product.rating &&
    product.rating < thresholds.lowRatingThreshold &&
    product.price
  ) {
    const avgPrice =
      context.allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / context.allProducts.length
    if (product.price < avgPrice) {
      return 'Read customer reviews carefully before purchasing'
    }
  }

  return undefined
}

/**
 * Generate complete risk disclosure
 */
export function generateRiskDisclosure(
  product: ProductForTrust,
  context: TrustContext
): RiskDisclosure {
  const { warnings, severity } = identifyRisks(product, context)
  const hasRisk = warnings.length > 0

  return {
    hasRisk,
    severity,
    warnings,
    mitigation: hasRisk ? generateMitigation(product, context) : undefined,
  }
}

/**
 * Format risk disclosure for display
 */
export function formatRiskDisclosure(disclosure: RiskDisclosure): string {
  if (!disclosure.hasRisk) {
    return ''
  }

  const severityIndicator: Record<'low' | 'medium' | 'high', string> = {
    low: '⚠️',
    medium: '⚠️ ⚠️',
    high: '🚨',
  }

  const header = `${severityIndicator[disclosure.severity]} Heads up:`
  const warningText = disclosure.warnings.join(' • ')
  const mitigation = disclosure.mitigation ? `\n💡 ${disclosure.mitigation}` : ''

  return `${header}\n${warningText}${mitigation}`
}

/**
 * Check if a product is risky enough to warn about
 */
export function isProductRisky(product: ProductForTrust, context: TrustContext): boolean {
  const { severity } = identifyRisks(product, context)
  return severity === 'high' || product.is_risky === true
}
