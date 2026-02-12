/**
 * Recommendation Explainer
 * Generate plain language explanations of why a product was recommended
 * Max 3 bullet points, no AI jargon, user-focused language
 */

import { RecommendationExplanation, ProductForTrust, TrustContext } from './types'

/**
 * Generate explanation points based on product characteristics
 */
export function generateExplanationPoints(
  product: ProductForTrust,
  context: TrustContext
): string[] {
  const points: string[] = []

  // Point 1: Price advantage
  if (product.price) {
    const avgPrice =
      context.allProducts.reduce((sum, p) => sum + (p.price || 0), 0) / context.allProducts.length
    const savings = ((avgPrice - product.price) / avgPrice) * 100

    if (savings > 10) {
      if (savings > 30) {
        points.push(`Significantly lower price – save around ${Math.round(savings)}%`)
      } else if (savings > 20) {
        points.push(`Good price – save around ${Math.round(savings)}% vs average`)
      } else {
        points.push(`Lower price than similar products`)
      }
    }
  }

  // Point 2: Rating & reviews
  if (product.rating && product.reviews_count) {
    const avgRating =
      context.allProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / context.allProducts.length
    const avgReviews =
      context.allProducts.reduce((sum, p) => sum + (p.reviews_count || 0), 0) /
      context.allProducts.length

    if (product.rating > avgRating && product.reviews_count > avgReviews) {
      points.push(
        `High rating (${product.rating.toFixed(1)}/5) with many verified purchases` +
          ` (${product.reviews_count} reviews)`
      )
    } else if (product.rating > avgRating) {
      points.push(`Good rating from customers (${product.rating.toFixed(1)}/5)`)
    } else if (product.reviews_count > avgReviews) {
      points.push(`Trusted by many buyers (${product.reviews_count} reviews)`)
    }
  }

  // Point 3: Shipping advantage
  if (product.shipping_days) {
    const avgShippingDays =
      context.allProducts.reduce((sum, p) => sum + (p.shipping_days || 0), 0) /
      context.allProducts.length

    if (product.shipping_days < avgShippingDays - 1) {
      if (product.shipping_price === 0) {
        points.push(`Fast shipping (${product.shipping_days} days) with free delivery`)
      } else {
        points.push(`Fast shipping (${product.shipping_days} days)`)
      }
    } else if (product.shipping_price === 0) {
      points.push(`Free shipping`)
    }
  }

  // Point 4: Badge information
  if (product.badge) {
    const badgeText: Record<string, string> = {
      best_choice: `Award: Best Choice in ${context.category || 'category'}`,
      best_value: `Ranked as best value – quality at a fair price`,
      fastest: `Fastest delivery option available`,
      cheapest: `Most affordable option`,
    }
    if (badgeText[product.badge]) {
      points.push(badgeText[product.badge])
    }
  }

  return points.slice(0, 3) // Max 3 points
}

/**
 * Determine sentiment based on product characteristics
 */
function determineSentiment(
  product: ProductForTrust,
  context: TrustContext
): 'positive' | 'neutral' | 'cautious' {
  if (!product.rating || !product.reviews_count) {
    return 'neutral'
  }

  const avgRating =
    context.allProducts.reduce((sum, p) => sum + (p.rating || 0), 0) / context.allProducts.length

  if (product.rating >= avgRating + 0.3 && product.reviews_count >= 50) {
    return 'positive' // Strong recommendation
  } else if (product.rating >= avgRating && product.reviews_count >= 10) {
    return 'neutral' // Standard recommendation
  } else {
    return 'cautious' // Weaker recommendation, needs careful presentation
  }
}

/**
 * Generate complete recommendation explanation
 */
export function generateRecommendationExplanation(
  product: ProductForTrust,
  context: TrustContext
): RecommendationExplanation {
  const points = generateExplanationPoints(product, context)
  const sentiment = determineSentiment(product, context)

  // If no points generated, provide generic safe explanation
  if (points.length === 0) {
    return {
      title: 'Why this product?',
      points: ['Available on selected platforms', 'Meets basic quality requirements'],
      sentiment: 'neutral',
    }
  }

  return {
    title: 'Why this recommendation?',
    points,
    sentiment,
  }
}

/**
 * Adjust explanation text tone based on sentiment
 */
export function formatExplanationWithTone(
  explanation: RecommendationExplanation
): RecommendationExplanation {
  // Could adjust language based on sentiment here
  // For now, return as-is
  return explanation
}
