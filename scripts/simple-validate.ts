/**
 * Simple Phase 3 Validation
 * Direct import without path aliases
 */

// Import the ranker module directly
import { rankProducts } from '../lib/scoring/ranker'

// Mock ScoredProduct type (same as in ranker.ts)
interface ScoredProduct {
  id: string
  platform: string
  title: string
  price: number
  currency: string
  rating?: number
  reviews_count?: number
  shipping_time_days?: number
  shipping_price?: number
  image?: string
  url: string
  score: number
  confidence: number
  badge?: 'best_choice' | 'best_value' | 'fastest' | 'cheapest'
}

function createProduct(overrides: Partial<ScoredProduct>): ScoredProduct {
  return {
    id: `product-${Math.random().toString(36).substr(2, 9)}`,
    platform: 'amazon',
    title: 'Test Product',
    price: 100,
    currency: 'USD',
    url: 'https://example.com',
    score: 0.7,
    confidence: 0.8,
    ...overrides,
  }
}

function testBestChoice() {
  const products = [
    createProduct({
      id: 'p1',
      score: 0.9,
      rating: 4.5,
      reviews_count: 100,
    }),
    createProduct({
      id: 'p2',
      score: 0.7,
      rating: 4.2,
      reviews_count: 60,
    }),
  ]

  const result = rankProducts(products)
  const bestChoice = result.find(p => p.badge === 'best_choice')

  return bestChoice?.id === 'p1'
}

function testBestValue() {
  const products = [
    createProduct({
      id: 'p1',
      price: 50,
      rating: 4.0,
      reviews_count: 100,
      score: 0.5,
    }),
    createProduct({
      id: 'p2',
      price: 200,
      rating: 5.0,
      reviews_count: 1000,
      score: 0.6,
    }),
  ]

  const result = rankProducts(products)
  const bestValue = result.find(p => p.badge === 'best_value')

  return bestValue?.id === 'p1'
}

function testFastest() {
  const products = [
    createProduct({
      id: 'p1',
      shipping_time_days: 10,
      score: 0.8,
    }),
    createProduct({
      id: 'p2',
      shipping_time_days: 2,
      score: 0.6,
    }),
  ]

  const result = rankProducts(products)
  const fastest = result.find(p => p.badge === 'fastest')

  return fastest?.id === 'p2'
}

function testCheapest() {
  const products = [
    createProduct({
      id: 'p1',
      price: 20,
      rating: 2.0,
    }),
    createProduct({
      id: 'p2',
      price: 45,
      rating: 4.0,
    }),
  ]

  const result = rankProducts(products)
  const cheapest = result.find(p => p.badge === 'cheapest')

  return cheapest?.id === 'p2'
}

function testExclusivity() {
  const products = [
    createProduct({
      id: 'p1',
      score: 0.95,
      rating: 4.5,
      reviews_count: 100,
      price: 50,
      shipping_time_days: 1,
    }),
  ]

  const result = rankProducts(products)
  const badges = result.filter(p => p.badge)

  return badges.length === 1 && badges[0].badge === 'best_choice'
}

function testDeterminism() {
  const products = [
    createProduct({ id: 'p1', score: 0.8, rating: 4.5, reviews_count: 100 }),
    createProduct({ id: 'p2', score: 0.7, rating: 4.2, reviews_count: 60 }),
  ]

  const result1 = rankProducts([...products])
  const result2 = rankProducts([...products])

  return (
    JSON.stringify(result1.map(p => p.badge)) ===
    JSON.stringify(result2.map(p => p.badge))
  )
}

function main() {
  console.log('🧪 Phase 3 Ranking Logic - Quick Validation\n')

  const tests = [
    { name: '✅ Best Choice', fn: testBestChoice },
    { name: '✅ Best Value', fn: testBestValue },
    { name: '✅ Fastest', fn: testFastest },
    { name: '✅ Cheapest', fn: testCheapest },
    { name: '✅ Exclusivity', fn: testExclusivity },
    { name: '✅ Determinism', fn: testDeterminism },
  ]

  let passed = 0

  for (const test of tests) {
    try {
      const result = test.fn()
      if (result) {
        console.log(`${test.name}: PASS`)
        passed++
      } else {
        console.log(`${test.name}: FAIL`)
      }
    } catch (err) {
      console.log(`${test.name}: ERROR - ${String(err)}`)
    }
  }

  console.log(`\n📊 Result: ${passed}/${tests.length} tests passed`)

  if (passed === tests.length) {
    console.log('\n🎉 All tests passed! Phase 3 implementation is correct.\n')
    process.exit(0)
  } else {
    process.exit(1)
  }
}

main()
