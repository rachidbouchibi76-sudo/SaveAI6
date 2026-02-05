/**
 * Price Intelligence Scoring Engine
 * Deterministic price analysis using math only
 * No external APIs, no ML, no randomness
 */

export interface PriceInput {
  price: number
  listPrice?: number
  averagePrice?: number
}

export interface PriceResult {
  priceScore: number // 0-1
  priceInsight: string
}

function clamp01(v: number): number {
  if (Number.isNaN(v) || !isFinite(v)) return 0.5
  return Math.max(0, Math.min(1, v))
}

/**
 * Compute price value score
 * Factors: discount detection, price position relative to average, anomaly detection
 * @param input Product price data
 * @returns Price score (0-1) and insight string
 */
export function computePriceScore(input: PriceInput): PriceResult {
  const price = typeof input.price === 'number' ? input.price : 0
  const listPrice = typeof input.listPrice === 'number' ? input.listPrice : undefined
  const averagePrice = typeof input.averagePrice === 'number' ? input.averagePrice : undefined

  let score = 0.5 // neutral baseline
  const insights: string[] = []

  // 1. DISCOUNT DETECTION
  let discountPercent = 0
  if (listPrice && listPrice > price) {
    discountPercent = ((listPrice - price) / listPrice) * 100
    if (discountPercent >= 5) {
      // Boost for discount (more discount = more boost, but cap at 30% boost)
      const discountBoost = Math.min(0.3, (discountPercent / 100) * 0.5)
      score += discountBoost
      insights.push(`💰 ${discountPercent.toFixed(0)}% discount off list price`)
    }
  }

  // 2. PRICE POSITION RELATIVE TO AVERAGE
  if (averagePrice && averagePrice > 0) {
    const priceRatio = price / averagePrice // < 1 = cheaper, > 1 = expensive

    // Detect price anomalies and position
    if (priceRatio < 0.2) {
      // Suspiciously cheap (< 20% of average)
      score = clamp01(score - 0.3)
      insights.push(`⚠️ Suspiciously cheap (${(priceRatio * 100).toFixed(0)}% of average)`)
    } else if (priceRatio < 0.8) {
      // Good deal (20-80% of average)
      const dealBoost = Math.min(0.25, (0.8 - priceRatio) * 0.4)
      score = clamp01(score + dealBoost)
      insights.push(`✓ Good price: ${(priceRatio * 100).toFixed(0)}% of average candidates`)
    } else if (priceRatio > 3.0) {
      // Suspiciously expensive (> 300% of average)
      score = clamp01(score - 0.35)
      insights.push(`⚠️ Significantly overpriced (${(priceRatio * 100).toFixed(0)}% of average)`)
    } else if (priceRatio > 1.5) {
      // Overpriced but not extreme (150-300% of average)
      const overpriceHuman = Math.min(0.2, (priceRatio - 1.0) * 0.15)
      score = clamp01(score - overpriceHuman)
      insights.push(`⚠️ Overpriced: ${(priceRatio * 100).toFixed(0)}% of average candidates`)
    } else if (priceRatio > 1.0) {
      // Slightly overpriced (100-150% of average)
      const slightPenalty = (priceRatio - 1.0) * 0.1
      score = clamp01(score - slightPenalty)
      insights.push(`Slightly above average: ${(priceRatio * 100).toFixed(0)}% of average`)
    } else if (priceRatio > 0.95) {
      // Nearly average
      insights.push(`Fair price: ${(priceRatio * 100).toFixed(0)}% of average`)
    } else {
      // Below average but not suspiciously cheap
      const dealBoost = (0.95 - priceRatio) * 0.2
      score = clamp01(score + dealBoost)
      insights.push(`✓ Below average: ${(priceRatio * 100).toFixed(0)}% of average`)
    }
  } else {
    // No average provided, make generic statement
    if (listPrice && listPrice > price && discountPercent > 0) {
      insights.push(`Discounted: ${discountPercent.toFixed(0)}% off`)
    } else {
      insights.push(`Price: $${price.toFixed(2)}`)
    }
  }

  // 3. ASSIGN PRICE TIER LABEL
  const finalScore = clamp01(score)
  let tier = ''
  if (finalScore >= 0.85) {
    tier = 'Excellent deal'
  } else if (finalScore >= 0.7) {
    tier = 'Good value'
  } else if (finalScore >= 0.5) {
    tier = 'Fair price'
  } else if (finalScore >= 0.3) {
    tier = 'Overpriced'
  } else {
    tier = 'Poor value'
  }
  insights.push(`Price tier: ${tier}`)

  const insight = insights.join(' | ')

  return {
    priceScore: Number(finalScore.toFixed(6)),
    priceInsight: insight,
  }
}

export default computePriceScore
