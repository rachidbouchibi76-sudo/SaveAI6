/**
 * Shipping Analysis Scoring Engine
 * Deterministic shipping value assessment using math only
 * No external APIs, no ML, no randomness
 */

export interface ShippingInput {
  shippingCost?: number
  deliveryDays?: number
  productPrice: number
}

export interface ShippingResult {
  shippingScore: number // 0-1
  shippingNote: string
}

function clamp01(v: number): number {
  if (Number.isNaN(v) || !isFinite(v)) return 0.5
  return Math.max(0, Math.min(1, v))
}

/**
 * Compute shipping value score
 * Factors: shipping cost relative to product price, delivery speed
 * @param input Shipping data
 * @returns Shipping score (0-1) and note string
 */
export function computeShippingScore(input: ShippingInput): ShippingResult {
  const productPrice = typeof input.productPrice === 'number' && input.productPrice > 0 ? input.productPrice : 1
  const shippingCost = typeof input.shippingCost === 'number' ? input.shippingCost : undefined
  const deliveryDays = typeof input.deliveryDays === 'number' ? input.deliveryDays : undefined

  let score = 0.5 // neutral baseline
  const notes: string[] = []

  // 1. SHIPPING COST EVALUATION
  if (shippingCost === undefined) {
    // No shipping cost provided - assume standard shipping
    notes.push('Standard shipping')
    score = 0.6
  } else if (shippingCost === 0) {
    // Free shipping - excellent!
    score = clamp01(score + 0.35)
    notes.push('🎁 Free shipping')
  } else {
    // Calculate shipping cost as percentage of product price
    const shippingPercent = (shippingCost / productPrice) * 100

    if (shippingPercent > 30) {
      // Expensive shipping (> 30% of product price)
      const heavyPenalty = Math.min(0.4, (shippingPercent / 100) * 0.5)
      score = clamp01(score - heavyPenalty)
      notes.push(`⚠️ High shipping: $${shippingCost.toFixed(2)} (${shippingPercent.toFixed(0)}% of price)`)
    } else if (shippingPercent > 15) {
      // Moderately expensive (15-30% of product price)
      const mediumPenalty = (shippingPercent - 15) / 100 * 0.2
      score = clamp01(score - mediumPenalty)
      notes.push(`⚠️ Shipping: $${shippingCost.toFixed(2)} (${shippingPercent.toFixed(0)}% of price)`)
    } else if (shippingPercent > 5) {
      // Reasonable shipping (5-15% of product price)
      const smallPenalty = (shippingPercent - 5) / 100 * 0.1
      score = clamp01(score - smallPenalty)
      notes.push(`✓ Reasonable shipping: $${shippingCost.toFixed(2)} (${shippingPercent.toFixed(0)}% of price)`)
    } else {
      // Low shipping (< 5% of product price)
      const lowCostBoost = (5 - shippingPercent) / 100 * 0.15
      score = clamp01(score + lowCostBoost)
      notes.push(`✓ Low shipping: $${shippingCost.toFixed(2)} (${shippingPercent.toFixed(0)}% of price)`)
    }
  }

  // 2. DELIVERY TIME EVALUATION
  if (deliveryDays === undefined) {
    // No delivery time provided - neutral
    if (notes.length === 0) notes.push('Delivery time not specified')
  } else if (deliveryDays <= 0) {
    // Invalid data, treat as neutral
    notes.push('Delivery time not available')
  } else if (deliveryDays === 1) {
    // Next day delivery - exceptional!
    score = clamp01(score + 0.25)
    notes.push('⚡ Next-day delivery')
  } else if (deliveryDays <= 3) {
    // Fast delivery (1-3 days)
    const fastBoost = (3 - deliveryDays) / 3 * 0.2
    score = clamp01(score + fastBoost)
    notes.push(`⚡ Fast delivery: ${deliveryDays} days`)
  } else if (deliveryDays <= 7) {
    // Standard delivery (3-7 days)
    notes.push(`✓ Standard delivery: ${deliveryDays} days`)
  } else if (deliveryDays <= 14) {
    // Slow delivery (7-14 days)
    const slowPenalty = (deliveryDays - 7) / 14 * 0.15
    score = clamp01(score - slowPenalty)
    notes.push(`⚠️ Slow delivery: ${deliveryDays} days`)
  } else if (deliveryDays <= 30) {
    // Very slow delivery (14-30 days)
    const verySlowPenalty = Math.min(0.3, (deliveryDays - 14) / 30 * 0.4)
    score = clamp01(score - verySlowPenalty)
    notes.push(`⚠️ Very slow delivery: ${deliveryDays} days`)
  } else {
    // Extremely slow (> 30 days)
    const extremePenalty = 0.45
    score = clamp01(score - extremePenalty)
    notes.push(`⚠️ Extremely slow delivery: ${deliveryDays} days`)
  }

  // 3. ASSIGN SHIPPING TIER
  const finalScore = clamp01(score)
  let tier = ''
  if (finalScore >= 0.85) {
    tier = 'Excellent'
  } else if (finalScore >= 0.7) {
    tier = 'Good'
  } else if (finalScore >= 0.5) {
    tier = 'Acceptable'
  } else if (finalScore >= 0.3) {
    tier = 'Poor'
  } else {
    tier = 'Very poor'
  }
  notes.push(`Shipping rating: ${tier}`)

  const shippingNote = notes.join(' | ')

  return {
    shippingScore: Number(finalScore.toFixed(6)),
    shippingNote,
  }
}

export default computeShippingScore
