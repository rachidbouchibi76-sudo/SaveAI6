/**
 * Call-to-Action (CTA) Optimizer
 * Generate optimized affiliate button copy based on product characteristics
 * Reduces friction and increases conversion
 */

import { ProductForTrust, OptimizedCTA, CTAVariant } from './types'

/**
 * Select best CTA variant based on product characteristics
 */
export function selectCTAVariant(product: ProductForTrust): CTAVariant {
  // If highly recommended (has best_choice badge), use stronger CTA
  if (product.badge === 'best_choice') {
    return 'buy_recommendation'
  }

  // If it's best value or price-focused, suggest checking price
  if (product.badge === 'best_value' || product.badge === 'cheapest') {
    return 'check_price'
  }

  // If risky or low on data, use softer CTA
  if (product.is_risky) {
    return 'get_option'
  }

  // Default safe CTA
  return 'check_price'
}

/**
 * Generate CTA copy variants
 */
const CTACopyVariants: Record<CTAVariant, string> = {
  buy_recommendation: 'Buy this recommendation',
  check_price: 'Check price on store',
  get_option: 'Get this option',
}

/**
 * Generate CTA reasoning for analytics/debugging
 */
function generateCTAReason(product: ProductForTrust, variant: CTAVariant): string {
  if (variant === 'buy_recommendation') {
    return 'Strong confidence – best choice product'
  }
  if (variant === 'check_price') {
    if (product.badge === 'cheapest') {
      return 'Price-focused product – lighter CTA to reduce friction'
    }
    return 'Standard product – encourage price comparison'
  }
  return 'Lower confidence – softer CTA to reduce friction'
}

/**
 * Generate optimized CTA
 */
export function generateOptimizedCTA(product: ProductForTrust): OptimizedCTA {
  const variant = selectCTAVariant(product)
  const copy = CTACopyVariants[variant]
  const reason = generateCTAReason(product, variant)

  return {
    variant,
    copy,
    reason,
  }
}

/**
 * Adjust CTA based on user behavior signals (optional extension)
 */
export function adjustCTAForContext(
  product: ProductForTrust,
  context: {
    isFirstRecommendation?: boolean
    userHasComparedBefore?: boolean
    conversionRate?: number
  }
): OptimizedCTA {
  let cta = generateOptimizedCTA(product)

  // If user has already compared similar products, use more direct CTA
  if (context.userHasComparedBefore && cta.variant === 'check_price') {
    cta.variant = 'get_option'
    cta.copy = 'Get this item'
  }

  return cta
}

/**
 * Get presentation rules for CTA
 */
export function getCTAPresentationRules(): string[] {
  return [
    'CTA must be directly below trust labels',
    'CTA must not open comparison again',
    'CTA must include affiliate tracking parameters',
    'CTA button should be primary color to encourage action',
    'Consider adding trust badge above CTA for extra credibility',
  ]
}

/**
 * Suggest CTA styling based on variant
 */
export function suggestCTAStyle(variant: CTAVariant): {
  buttonStyle: 'primary' | 'secondary'
  iconSuggestion?: string
  urgencyIndicator?: string
} {
  const styleMap: Record<
    CTAVariant,
    { buttonStyle: 'primary' | 'secondary'; iconSuggestion?: string; urgencyIndicator?: string }
  > = {
    buy_recommendation: {
      buttonStyle: 'primary',
      iconSuggestion: '→ or 🛒',
      urgencyIndicator: 'None – confidence already high',
    },
    check_price: {
      buttonStyle: 'secondary',
      iconSuggestion: '→ or 🔍',
      urgencyIndicator: 'Optional: "See current price"',
    },
    get_option: {
      buttonStyle: 'secondary',
      iconSuggestion: '→',
      urgencyIndicator: 'None – neutral tone',
    },
  }

  return styleMap[variant]
}
