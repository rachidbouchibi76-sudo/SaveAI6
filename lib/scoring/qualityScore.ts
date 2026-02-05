/**
 * Product Quality Scoring Engine
 * Deterministic quality assessment using only numeric and text fields
 * No external APIs, no ML, no randomness
 */

export interface QualityInput {
  rating?: number // 0-5
  reviewsCount?: number
  brand?: string
  price?: number
}

export interface QualityResult {
  qualityScore: number // 0-1
  qualitySignals: string[]
}

// Configurable list of trusted brands (can be extended)
const TRUSTED_BRANDS = new Set([
  'apple',
  'microsoft',
  'amazon',
  'google',
  'sony',
  'samsung',
  'lg',
  'intel',
  'nvidia',
  'corsair',
  'evga',
  'logitech',
  'razer',
  'asus',
  'dell',
  'hp',
  'lenovo',
  'canon',
  'nikon',
  'panasonic',
  'philips',
  'sennheiser',
  'bose',
  'jbl',
  'audio-technica',
  'rode',
  'shure',
  'behringer',
  'yamaha',
  'pioneer',
  'boss',
  'fender',
  'gibson',
  'roland',
  'korg',
])

function normalizeScore(v: number): number {
  if (Number.isNaN(v) || !isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function normalizeBrand(brand?: string): string {
  if (!brand) return ''
  return brand.toLowerCase().trim()
}

/**
 * Compute a deterministic quality score for a product
 * @param input Product data with rating, reviews, brand, price
 * @returns Quality score (0-1) and explainable signals
 */
export function computeQualityScore(input: QualityInput): QualityResult {
  const signals: string[] = []
  const rating = typeof input.rating === 'number' ? input.rating : 0
  const reviewsCount = typeof input.reviewsCount === 'number' ? input.reviewsCount : 0
  const brand = normalizeBrand(input.brand)
  const price = typeof input.price === 'number' ? input.price : 0

  // BASE SCORE: rating (0-1, normalized from 0-5 scale)
  let baseScore = normalizeScore(rating / 5)
  if (rating > 0) {
    signals.push(`Rating: ${rating.toFixed(1)}/5`)
  }

  // PENALTY 1: High rating with suspiciously low review count
  // Heuristic: if rating >= 4.5 but reviews < 10, it's suspicious
  if (rating >= 4.5 && reviewsCount < 10 && reviewsCount > 0) {
    const penalty = 0.15
    baseScore = normalizeScore(baseScore - penalty)
    signals.push(`⚠️ High rating (${rating.toFixed(1)}) with very few reviews (${reviewsCount})`)
  }

  // PENALTY 2: Suspiciously cheap products
  // Heuristic: if price < $5 and rating >= 4.0, likely fake/scam reviews
  // Also if price is unusually low relative to category (but we don't have category context)
  // So we use simple heuristic: price < $3 with high rating
  if (price > 0 && price < 3 && rating >= 4.0) {
    const penalty = 0.2
    baseScore = normalizeScore(baseScore - penalty)
    signals.push(`⚠️ Suspiciously cheap product ($${price.toFixed(2)}) with high rating`)
  }

  // BOOST: Review count credibility (more reviews = more credible)
  // Logarithmic scale: doesn't need thousands, but at least some substantiation
  let reviewBoost = 0
  if (reviewsCount >= 100) {
    reviewBoost = 0.1
    signals.push(`✓ Strong review count (${reviewsCount})`)
  } else if (reviewsCount >= 50) {
    reviewBoost = 0.07
    signals.push(`✓ Decent review count (${reviewsCount})`)
  } else if (reviewsCount >= 20) {
    reviewBoost = 0.04
    signals.push(`✓ Some reviews (${reviewsCount})`)
  } else if (reviewsCount >= 5) {
    reviewBoost = 0.02
  }
  baseScore = normalizeScore(baseScore + reviewBoost)

  // BOOST: Trusted brand
  let brandBoost = 0
  if (brand && TRUSTED_BRANDS.has(brand)) {
    brandBoost = 0.15
    signals.push(`✓ Trusted brand: ${input.brand}`)
  }
  baseScore = normalizeScore(baseScore + brandBoost)

  // PENALTY: No rating data (unknown quality)
  if (rating === 0 && reviewsCount === 0) {
    baseScore = normalizeScore(baseScore - 0.3)
    signals.push(`⚠️ No rating or review data available`)
  }

  // Final normalization
  const qualityScore = normalizeScore(baseScore)

  // Add general quality tier to signals
  if (qualityScore >= 0.8) {
    signals.push(`Quality tier: Excellent`)
  } else if (qualityScore >= 0.6) {
    signals.push(`Quality tier: Good`)
  } else if (qualityScore >= 0.4) {
    signals.push(`Quality tier: Fair`)
  } else {
    signals.push(`Quality tier: Low`)
  }

  return {
    qualityScore: Number(qualityScore.toFixed(6)),
    qualitySignals: signals,
  }
}

export default computeQualityScore
