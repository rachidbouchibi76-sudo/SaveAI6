import { Product, SearchInput } from '@/lib/types/product'

const TOP_N = 10
const MIN_CONFIDENCE_THRESHOLD = 0.6
const MIN_REVIEW_COUNT = 10
const VERY_SHORT_TITLE_LENGTH = 15

const WEIGHTS = {
  price: 0.35,
  rating: 0.30,
  reviews: 0.15,
  shipping: 0.20,
}

interface ScoredProduct extends Product {
  score: number
  confidence: number
}

export function scoreProducts(
  input: SearchInput,
  products: Product[]
): Product[] {
  if (products.length === 0) return []
  
  const scoredProducts = products.map(product => 
    calculateScore(product, products, input)
  )
  
  // Filter out results with confidence below threshold
  const highConfidenceProducts = scoredProducts.filter(
    p => p.confidence >= MIN_CONFIDENCE_THRESHOLD
  )
  
  // If top result has low confidence, return empty
  if (highConfidenceProducts.length === 0 || 
      (scoredProducts[0] && scoredProducts[0].confidence < MIN_CONFIDENCE_THRESHOLD)) {
    return []
  }
  
  highConfidenceProducts.sort((a, b) => b.score - a.score)
  
  return highConfidenceProducts.slice(0, TOP_N)
}

function calculateScore(
  product: Product,
  allProducts: Product[],
  input: SearchInput
): ScoredProduct {
  const priceScore = calculatePriceScore(product, allProducts)
  const ratingScore = calculateRatingScore(product, allProducts)
  const reviewsScore = calculateReviewsScore(product, allProducts)
  const shippingScore = calculateShippingScore(product, allProducts)

  const totalScore =
    priceScore * WEIGHTS.price +
    ratingScore * WEIGHTS.rating +
    reviewsScore * WEIGHTS.reviews +
    shippingScore * WEIGHTS.shipping

  const clampedScore = Math.max(0, Math.min(1, totalScore))
  const confidence = calculateConfidence(product, allProducts, priceScore, reviewsScore)

  return {
    ...product,
    score: clampedScore,
    confidence,
  }
}

function calculatePriceScore(product: Product, allProducts: Product[]): number {
  if (typeof product.price !== 'number' || product.price <= 0) {
    return 0
  }
  
  const prices = allProducts
    .map(p => p.price)
    .filter(p => typeof p === 'number' && p > 0)
  
  if (prices.length === 0) return 0.5
  
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)
  
  if (maxPrice === minPrice) return 1
  
  const normalizedPrice = (maxPrice - product.price) / (maxPrice - minPrice)
  
  return Math.max(0, Math.min(1, normalizedPrice))
}

function calculateRatingScore(product: Product, allProducts: Product[]): number {
  if (typeof product.rating !== 'number' || product.rating <= 0) {
    return 0
  }

  // Bayesian average: blend product rating with a global prior (C)
  // v = number of reviews, m = strength of prior
  const v = typeof product.reviews_count === 'number' ? product.reviews_count : 0
  const R = product.rating // on 0-5 scale

  // Choose prior mean C as the mean rating across all products or fallback 3.5
  const ratings = allProducts.map(p => (typeof p.rating === 'number' ? p.rating : 0)).filter(r => r > 0)
  const C = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 3.5

  // m controls how strongly we trust the prior when reviews are low
  const m = 50 // moderate prior strength; increases pull toward C for low v

  const bayesianRating = ((v * R) + (m * C)) / (v + m)

  // normalize to 0-1
  const normalized = bayesianRating / 5
  return Math.max(0, Math.min(1, normalized))
}

function calculateReviewsScore(product: Product, allProducts: Product[]): number {
  const v = typeof product.reviews_count === 'number' ? product.reviews_count : 0
  if (v <= 0) return 0

  // Heavy penalty for very low review count
  if (v < MIN_REVIEW_COUNT) return 0.05

  const reviewCounts = allProducts.map(p => (typeof p.reviews_count === 'number' ? p.reviews_count : 0)).filter(r => r > 0)
  if (reviewCounts.length === 0) return 0.5

  // Use log10 scaling to reduce impact of outliers
  const logs = reviewCounts.map(r => Math.log10(r + 1))
  const maxLog = Math.max(...logs)
  if (maxLog === 0) return 0.5

  const valLog = Math.log10(v + 1)
  const normalized = valLog / maxLog
  return Math.max(0, Math.min(1, normalized))
}

function calculateShippingScore(product: Product, allProducts: Product[]): number {
  // If both fields missing, small penalty
  if (product.shipping_price === undefined && product.shipping_time_days === undefined) {
    return 0.4
  }

  // Price component: free shipping => 1. otherwise normalize vs max shipping in set
  let priceComponent = 0
  if (product.shipping_price === 0) {
    priceComponent = 1
  } else if (typeof product.shipping_price === 'number') {
    const shippingPrices = allProducts.map(p => (typeof p.shipping_price === 'number' ? p.shipping_price : NaN)).filter(n => !Number.isNaN(n))
    const maxShip = shippingPrices.length ? Math.max(...shippingPrices) : 0
    if (maxShip > 0) {
      priceComponent = Math.max(0, Math.min(1, 1 - (product.shipping_price / maxShip)))
    } else {
      // unknown max, give neutral score
      priceComponent = 0.5
    }
  } else {
    priceComponent = 0.5
  }

  // Time component: map days to score
  let timeComponent = 0.5
  if (typeof product.shipping_time_days === 'number') {
    const d = product.shipping_time_days
    if (d <= 2) timeComponent = 1
    else if (d <= 5) timeComponent = 0.7
    else if (d <= 10) timeComponent = 0.4
    else timeComponent = 0.1
  } else {
    timeComponent = 0.5
  }

  // Combine equally
  const combined = (priceComponent * 0.5) + (timeComponent * 0.5)
  return Math.max(0, Math.min(1, combined))
}

function calculateQualityScore(product: Product, allProducts: Product[]): number {
  let penalty = 0
  
  // Penalty for very short titles
  if ((product.title || '').length < VERY_SHORT_TITLE_LENGTH) {
    penalty += 0.15
  }
  
  // Penalty for suspicious price outliers
  const prices = allProducts
    .map(p => p.price)
    .filter(p => typeof p === 'number' && p > 0)
  
  if (prices.length > 1) {
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const stdDev = Math.sqrt(
      prices.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / prices.length
    )
    
    if (stdDev > 0) {
      const zScore = Math.abs((product.price - avgPrice) / stdDev)
      if (zScore > 3) {
        penalty += 0.2
      }
    }
  }
  
  const qualityScore = 1 - Math.min(penalty, 0.5)
  return Math.max(0, Math.min(1, qualityScore))
}

function calculateConfidence(
  product: Product,
  allProducts: Product[],
  priceScore: number,
  reviewsScore: number
): number {
  let confidence = 0.8
  
  // Reduce confidence if attributes are missing
  if (!product.rating || product.rating === 0) {
    confidence -= 0.15
  }
  
  if (!product.reviews_count || product.reviews_count === 0) {
    confidence -= 0.2
  }
  
  if (product.shipping_price === undefined || product.shipping_time_days === undefined) {
    confidence -= 0.1
  }
  
  // Reduce confidence if price is near the band threshold (±40%)
  if (allProducts.length > 0) {
    const prices = allProducts
      .map(p => p.price)
      .filter(p => typeof p === 'number' && p > 0)
    
    if (prices.length > 0) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const range = maxPrice - minPrice
      
      if (range > 0) {
        const priceFromMin = product.price - minPrice
        const priceFromMax = maxPrice - product.price
        
        // Near boundaries
        if (priceFromMin < range * 0.1 || priceFromMax < range * 0.1) {
          confidence -= 0.1
        }
      }
    }
  }
  
  return Math.max(0, Math.min(1, confidence))
}