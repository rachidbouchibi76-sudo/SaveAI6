import { Product, SearchInput } from '@/lib/types/product'

type ScoreBreakdown = {
  priceAdvantage: { raw: number; normalized: number; weight: number; contribution: number }
  rating: { raw: number; normalized: number; weight: number; contribution: number }
  reviews: { raw: number; normalized: number; weight: number; contribution: number }
  availability: { raw: number; normalized: number; weight: number; contribution: number }
  shipping: { raw: number; normalized: number; weight: number; contribution: number }
}

export type RecommendedProduct = Product & {
  finalScore: number
  scoreBreakdown: ScoreBreakdown
}

function clamp01(v: number) {
  if (Number.isNaN(v) || !isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/**
 * Deterministic, explainable scoring for product recommendations.
 * Uses only numeric and boolean fields derived from `Product`.
 */
export function recommendProducts(products: Product[], context?: SearchInput): RecommendedProduct[] {
  // Weights (sum = 1.0)
  const WEIGHTS = {
    priceAdvantage: 0.4,
    rating: 0.25,
    reviews: 0.15,
    availability: 0.1,
    shipping: 0.1,
  }

  // Gather some global statistics for normalization
  const prices = products.map(p => (typeof p.price === 'number' ? p.price : NaN)).filter(n => !Number.isNaN(n))
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : minPrice

  const ratings = products.map(p => (typeof p.rating === 'number' ? p.rating : 0))
  const maxRating = 5 // ratings are on 0-5 scale

  const reviewsArr = products.map(p => (typeof p.reviews === 'number' ? p.reviews : 0))
  const maxReviews = reviewsArr.length ? Math.max(...reviewsArr) : 0

  const shippingCosts = products.map(p => (p.shipping && typeof p.shipping.cost === 'number' ? p.shipping.cost : NaN)).filter(n => !Number.isNaN(n))
  const maxShipping = shippingCosts.length ? Math.max(...shippingCosts) : 0

  // Extracted product price (if provided) to compute price advantage against original
  const targetPrice = context?.extractedProduct?.price

  const scored = products.map(p => {
    // PRICE ADVANTAGE
    const price = typeof p.price === 'number' ? p.price : NaN
    let rawPriceAdv = 0
    if (typeof targetPrice === 'number' && isFinite(targetPrice) && targetPrice > 0) {
      // advantage proportional to percent cheaper than the target product
      rawPriceAdv = Math.max(0, (targetPrice - price) / targetPrice)
    } else if (!Number.isNaN(price) && maxPrice > minPrice) {
      // advantage relative to price range (lower price -> higher advantage)
      rawPriceAdv = (maxPrice - price) / (maxPrice - minPrice)
    } else {
      rawPriceAdv = 0
    }
    const priceAdvNorm = clamp01(rawPriceAdv)

    // RATING
    const rawRating = typeof p.rating === 'number' ? p.rating : 0
    const ratingNorm = clamp01(rawRating / maxRating)

    // REVIEWS (diminishing returns via log scale)
    const rawReviews = typeof p.reviews === 'number' ? p.reviews : 0
    const reviewsNorm = maxReviews > 0 ? Math.log10(1 + rawReviews) / Math.log10(1 + maxReviews) : 0
    const reviewsNormClamped = clamp01(reviewsNorm)

    // AVAILABILITY
    // Heuristic: prefer numeric availability indicators in metadata (stock/quantity)
    let availabilityRaw = 1 // default optimistic: available
    const meta = p.metadata as Record<string, any> | undefined
    if (meta) {
      const keys = Object.keys(meta)
      for (const k of ['stock', 'quantity', 'available', 'in_stock', 'inventory']) {
        if (k in meta) {
          const v = meta[k]
          if (typeof v === 'number') {
            availabilityRaw = v > 0 ? 1 : 0
            break
          }
          if (typeof v === 'boolean') {
            availabilityRaw = v ? 1 : 0
            break
          }
        }
      }
    }
    // Also allow explicit shipping boolean as proxy (if metadata absent)
    if (availabilityRaw === 1 && meta == null) availabilityRaw = 1

    const availabilityNorm = availabilityRaw ? 1 : 0

    // SHIPPING
    let shippingRaw = 0
    if (p.shipping) {
      if (typeof p.shipping.cost === 'number') shippingRaw = p.shipping.cost
      else if (typeof p.shipping.isFree === 'boolean') shippingRaw = p.shipping.isFree ? 0 : 1
      else shippingRaw = 0
    } else {
      shippingRaw = 0
    }
    // normalize: lower cost -> higher score
    let shippingNorm = 0
    if (typeof p.shipping?.isFree === 'boolean' && p.shipping.isFree === true) {
      shippingNorm = 1
    } else if (typeof shippingRaw === 'number' && maxShipping > 0) {
      shippingNorm = clamp01(1 - shippingRaw / maxShipping)
    } else if (shippingRaw === 0) {
      shippingNorm = 1
    } else {
      shippingNorm = 0
    }

    // Compose weighted contributions
    const cPrice = WEIGHTS.priceAdvantage * priceAdvNorm
    const cRating = WEIGHTS.rating * ratingNorm
    const cReviews = WEIGHTS.reviews * reviewsNormClamped
    const cAvailability = WEIGHTS.availability * availabilityNorm
    const cShipping = WEIGHTS.shipping * shippingNorm

    const finalScore = clamp01(cPrice + cRating + cReviews + cAvailability + cShipping)

    const breakdown: ScoreBreakdown = {
      priceAdvantage: { raw: Number(rawPriceAdv.toFixed(6)), normalized: Number(priceAdvNorm.toFixed(6)), weight: WEIGHTS.priceAdvantage, contribution: Number(cPrice.toFixed(6)) },
      rating: { raw: Number(rawRating.toFixed(3)), normalized: Number(ratingNorm.toFixed(6)), weight: WEIGHTS.rating, contribution: Number(cRating.toFixed(6)) },
      reviews: { raw: rawReviews, normalized: Number(reviewsNormClamped.toFixed(6)), weight: WEIGHTS.reviews, contribution: Number(cReviews.toFixed(6)) },
      availability: { raw: availabilityRaw, normalized: availabilityNorm, weight: WEIGHTS.availability, contribution: Number(cAvailability.toFixed(6)) },
      shipping: { raw: typeof shippingRaw === 'number' ? shippingRaw : 0, normalized: Number(shippingNorm.toFixed(6)), weight: WEIGHTS.shipping, contribution: Number(cShipping.toFixed(6)) },
    }

    return {
      product: p,
      finalScore,
      scoreBreakdown: breakdown,
    }
  })

  // deterministic sort: by finalScore desc, then by price asc, then by id asc
  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
    const pa = typeof a.product.price === 'number' ? a.product.price : Infinity
    const pb = typeof b.product.price === 'number' ? b.product.price : Infinity
    if (pa !== pb) return pa - pb
    return a.product.id.localeCompare(b.product.id)
  })

  return scored.map(s => ({ ...s.product, finalScore: Number(s.finalScore.toFixed(6)), scoreBreakdown: s.scoreBreakdown }))
}

export default recommendProducts
