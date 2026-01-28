import { Product, SearchInput } from '@/lib/types/product'

const TOP_N = 10

const WEIGHTS = {
  price: 0.4,
  rating: 0.3,
  reviews: 0.2,
  shipping: 0.1,
}

interface ScoredProduct extends Product {
  score: number
}

export function scoreProducts(
  input: SearchInput,
  products: Product[]
): Product[] {
  if (products.length === 0) return []
  
  const scoredProducts = products.map(product => 
    calculateScore(product, products, input)
  )
  
  scoredProducts.sort((a, b) => b.score - a.score)
  
  return scoredProducts.slice(0, TOP_N)
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
  
  const totalScore = 
    priceScore * WEIGHTS.price +
    ratingScore * WEIGHTS.rating +
    reviewsScore * WEIGHTS.reviews +
    shippingScore * WEIGHTS.shipping
  
  const clampedScore = Math.max(0, Math.min(1, totalScore))
  
  return {
    ...product,
    score: clampedScore,
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
  
  return Math.max(0, Math.min(1, normalizedRating))
}

function calculateReviewsScore(product: Product, allProducts: Product[]): number {
  if (typeof product.reviews !== 'number' || product.reviews <= 0) {
    return 0
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
    return 0.5
  }
  
  if (product.shipping.isFree) {
    return 1
  }
  
  const estimatedDays = product.shipping.estimatedDays
  
  if (typeof estimatedDays !== 'number' || estimatedDays <= 0) {
    return 0.5
  }
  
  if (estimatedDays <= 2) return 1
  if (estimatedDays <= 5) return 0.8
  if (estimatedDays <= 7) return 0.6
  if (estimatedDays <= 14) return 0.4
  
  return 0.2
}