/**
 * Trust & Conversion Layer Type Definitions
 * Thin layer above recommendation engine for trust building and conversion optimization
 * No modifications to scoring logic - purely presentational
 */

/**
 * Trust labels that help users understand product positioning
 */
export type TrustLabel =
  | 'best_value'
  | 'cheapest_safe'
  | 'long_term_choice'
  | 'fastest_delivery'
  | 'most_reviewed'
  | 'higher_risk_lower_price'

/**
 * Display label for UI rendering
 */
export interface TrustLabelDisplay {
  label: TrustLabel
  displayText: string // "Best Value", "Cheapest Safe Option", etc.
  explanation: string // Brief explanation for this label
  priority: number // 1 (highest) to 6 (lowest) - for display ordering
}

/**
 * Confidence score based on data completeness
 */
export type ConfidenceLevel = 'Low' | 'Medium' | 'High'

export interface ConfidenceIndicator {
  level: ConfidenceLevel
  completeness: number // Percentage of available metrics (0-100)
  missingMetrics: string[] // Which metrics are missing
  reason: string // Human-readable explanation
}

/**
 * Plain language explanation of why product was recommended
 */
export interface RecommendationExplanation {
  title: string // "Why this recommendation?"
  points: string[] // Max 3 bullet points
  sentiment: 'positive' | 'neutral' | 'cautious' // Adjusts tone
}

/**
 * Call-to-action variant for affiliate button
 */
export type CTAVariant = 'buy_recommendation' | 'check_price' | 'get_option'

export interface OptimizedCTA {
  variant: CTAVariant
  copy: string // "Buy this recommendation", "Check price on store", etc.
  reason: string // Why this CTA for this product
}

/**
 * Risk disclosure when product doesn't meet all quality standards
 */
export interface RiskDisclosure {
  hasRisk: boolean
  severity: 'low' | 'medium' | 'high' // How prominent to display
  warnings: string[] // List of specific risks
  mitigation?: string // What mitigates the risk (e.g., "Consider as budget option")
}

/**
 * Complete trust & conversion data for a product
 * Added to recommended product before sending to UI
 */
export interface TrustLayerData {
  // Primary trust signals
  trustLabels: TrustLabelDisplay[]
  confidence: ConfidenceIndicator
  explanation: RecommendationExplanation

  // Conversion optimization
  cta: OptimizedCTA
  risk: RiskDisclosure

  // Metadata
  generatedAt: Date
  dataQuality: {
    hasPrice: boolean
    hasRating: boolean
    hasReviewCount: boolean
    hasDeliveryTime: boolean
    hasShippingCost: boolean
  }
}

/**
 * Product fields required for trust layer calculations
 * (subset of full Product interface)
 */
export interface ProductForTrust {
  id: string
  title: string
  platform: string
  price?: number
  rating?: number
  reviews_count?: number
  shipping_days?: number
  shipping_price?: number
  badge?: 'best_choice' | 'best_value' | 'fastest' | 'cheapest'
  isRecommended?: boolean
  is_risky?: boolean
}

/**
 * Thresholds for trust label generation
 * Configurable per use case
 */
export interface TrustThresholds {
  // Quality gates
  minRatingForSafe: number // e.g., 4.0
  minReviewsForReliable: number // e.g., 50
  minReviewsForChosen: number // e.g., 10

  // Best value calculation
  ValueScoreThreshold: number // e.g., 0.5

  // Most reviewed threshold
  mostReviewedPercentile: number // e.g., 75 (top 25% of products)

  // Risk indicators
  lowRatingThreshold: number // e.g., 3.5
  lowReviewThreshold: number // e.g., 5
}

/**
 * Context for trust layer - e.g., which products to compare against
 */
export interface TrustContext {
  allProducts: ProductForTrust[]
  category?: string
  thresholds?: Partial<TrustThresholds>
}
