/**
 * Recommendation module exports
 */
export {
  recommendProducts,
  getVerifiedOnly,
  getRecommendationStats,
  type RecommendedProduct,
} from './recommendProducts'
export { applyGuardrails, getRecommendedOnly, getAllWithWarnings, type GuardrailConfig, type CategoryThresholds } from './guardrails'
