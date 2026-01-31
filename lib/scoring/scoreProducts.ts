import { Product, SearchInput } from '@/lib/types/product'

const TOP_N = 10
const MIN_CONFIDENCE_THRESHOLD = 0.6
const MIN_REVIEW_COUNT = 10
const VERY_SHORT_TITLE_LENGTH = 15

const WEIGHTS = {
  price: 0.35,
  rating: 0.2,
  reviews: 0.25,
  shipping: 0.1,
  quality: 0.1,
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
  const ratingScore = calculateRatingScore(product)
  const reviewsScore = calculateReviewsScore(product, allProducts)
  const shippingScore = calculateShippingScore(product)
  const qualityScore = calculateQualityScore(product, allProducts)
  
  const totalScore = 
    priceScore * WEIGHTS.price +
    ratingScore * WEIGHTS.rating +
    reviewsScore * WEIGHTS.reviews +
    shippingScore * WEIGHTS.shipping +
    qualityScore * WEIGHTS.quality
  
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

function calculateRatingScore(product: Product): number {
  if (typeof product.rating !== 'number' || product.rating <= 0) {
    return 0
  }
  
  const normalizedRating = product.rating / 5
  
  // Cap rating impact so it doesn't dominate the score
  return Math.max(0, Math.min(0.8, normalizedRating))
}

function calculateReviewsScore(product: Product, allProducts: Product[]): number {
  if (typeof product.reviews !== 'number' || product.reviews <= 0) {
    return 0
  }
  
  // Heavy penalty for low review count (< 10 reviews)
  if (product.reviews < MIN_REVIEW_COUNT) {
    return 0.1
  }
  
  const reviewCounts = allProducts
    .map(p => p.reviews || 0)
    .filter(r => r > 0)
  
  if (reviewCounts.length === 0) return 0.5
  
  const maxReviews = Math.max(...reviewCounts)
  
  if (maxReviews === 0) return 0.5
  
  const logProduct = Math.log(product.reviews + 1)
  const logMax = Math.log(maxReviews + 1)
  
  const normalizedReviews = logProduct / logMax
  
  return Math.max(0, Math.min(1, normalizedReviews))
}

function calculateShippingScore(product: Product): number {
  if (!product.shipping) {
    // Small penalty for missing shipping info
    return 0.4
  }
  
  if (product.shipping.isFree) {
    return 1
  }
  
  const estimatedDays = product.shipping.estimatedDays
  
  if (typeof estimatedDays !== 'number' || estimatedDays <= 0) {
    return 0.4
  }
  
  if (estimatedDays <= 2) return 1
  if (estimatedDays <= 5) return 0.8
  if (estimatedDays <= 7) return 0.6
  if (estimatedDays <= 14) return 0.4
  
  return 0.2
}

function calculateQualityScore(product: Product, allProducts: Product[]): number {
  let penalty = 0
  
  // Penalty for very short titles
  if (product.name.length < VERY_SHORT_TITLE_LENGTH) {
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
  
  if (!product.reviews || product.reviews === 0) {
    confidence -= 0.2
  }
  
  if (!product.shipping) {
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