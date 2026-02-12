/**
 * Phase 3 Validation Script
 * Standalone validation of ranking logic
 * Run with: ts-node scripts/validate-ranker.ts
 */

import { rankProducts, type ProductBadge } from '@/lib/scoring/ranker'

// Mock ScoredProduct type
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
  badge?: ProductBadge
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

function formatResult(title: string, passed: boolean): string {
  return `${passed ? '✅ PASS' : '❌ FAIL'} - ${title}`
}

function main() {
  console.log('🧪 Phase 3 Ranking Logic Validation\n')

  let totalTests = 0
  let passedTests = 0

  // ===== Test 1: Best Choice =====
  console.log('\n📋 Test 1: Best Choice (الأفضل إجمالاً)')

  const test1_products = [
    createProduct({
      id: 'p1',
      title: 'Premium Product',
      score: 0.9,
      rating: 4.5,
      reviews_count: 100,
      price: 150,
    }),
    createProduct({
      id: 'p2',
      title: 'Standard Product',
      score: 0.7,
      rating: 4.2,
      reviews_count: 60,
      price: 100,
    }),
  ]

  const test1_result = rankProducts(test1_products)
  const test1_bestChoice = test1_result.find(p => p.badge === 'best_choice')
  const test1_passed = test1_bestChoice?.id === 'p1'

  console.log(formatResult('Highest score with valid constraints gets best_choice', test1_passed))
  totalTests++
  if (test1_passed) passedTests++

  // ===== Test 2: Best Choice - Rating Constraint =====
  console.log('\n📋 Test 2: Best Choice - Rating Constraint')

  const test2_products = [
    createProduct({
      id: 'p1',
      title: 'Low Rated Premium',
      score: 0.95,
      rating: 3.9, // Below 4.0
      reviews_count: 100,
    }),
    createProduct({
      id: 'p2',
      title: 'Well Rated Good',
      score: 0.8,
      rating: 4.1,
      reviews_count: 100,
    }),
  ]

  const test2_result = rankProducts(test2_products)
  const test2_bestChoice = test2_result.find(p => p.badge === 'best_choice')
  const test2_passed = test2_bestChoice?.id === 'p2'

  console.log(formatResult('Skips products with rating <= 4.0', test2_passed))
  totalTests++
  if (test2_passed) passedTests++

  // ===== Test 3: Best Value =====
  console.log('\n📋 Test 3: Best Value (الأفضل قيمة مقابل السعر)')

  const test3_products = [
    createProduct({
      id: 'p1',
      title: 'Value King',
      price: 50,
      rating: 4.0,
      reviews_count: 100,
      score: 0.5,
    }),
    createProduct({
      id: 'p2',
      title: 'Premium Expensive',
      price: 200,
      rating: 5.0,
      reviews_count: 1000,
      score: 0.6,
    }),
  ]

  const test3_result = rankProducts(test3_products)
  const test3_bestValue = test3_result.find(p => p.badge === 'best_value')
  const test3_passed = test3_bestValue?.id === 'p1'

  console.log(formatResult('Best value score gets best_value badge', test3_passed))
  totalTests++
  if (test3_passed) passedTests++

  // ===== Test 4: Fastest Delivery =====
  console.log('\n📋 Test 4: Fastest Delivery (الأسرع وصولاً)')

  const test4_products = [
    createProduct({
      id: 'p1',
      title: 'Slow Delivery',
      shipping_time_days: 10,
      score: 0.8,
    }),
    createProduct({
      id: 'p2',
      title: 'Express Delivery',
      shipping_time_days: 2,
      score: 0.6,
    }),
    createProduct({
      id: 'p3',
      title: 'Standard Delivery',
      shipping_time_days: 5,
      score: 0.7,
    }),
  ]

  const test4_result = rankProducts(test4_products)
  const test4_fastest = test4_result.find(p => p.badge === 'fastest')
  const test4_passed = test4_fastest?.id === 'p2'

  console.log(formatResult('Minimum shipping time gets fastest badge', test4_passed))
  totalTests++
  if (test4_passed) passedTests++

  // ===== Test 5: Fastest - Tie Breaker =====
  console.log('\n📋 Test 5: Fastest - Tie Breaker')

  const test5_products = [
    createProduct({
      id: 'p1',
      title: 'Express A',
      shipping_time_days: 2,
      score: 0.7,
    }),
    createProduct({
      id: 'p2',
      title: 'Express B',
      shipping_time_days: 2,
      score: 0.9, // Higher score
    }),
  ]

  const test5_result = rankProducts(test5_products)
  const test5_fastest = test5_result.find(p => p.badge === 'fastest')
  const test5_passed = test5_fastest?.id === 'p2'

  console.log(formatResult('Tie-breaker uses highest score', test5_passed))
  totalTests++
  if (test5_passed) passedTests++

  // ===== Test 6: Cheapest =====
  console.log('\n📋 Test 6: Cheapest (الأرخص بجودة مقبولة)')

  const test6_products = [
    createProduct({
      id: 'p1',
      title: 'Cheap Junk',
      price: 20,
      rating: 2.0, // Too low
    }),
    createProduct({
      id: 'p2',
      title: 'Budget Good',
      price: 45,
      rating: 4.0, // Meets threshold
    }),
    createProduct({
      id: 'p3',
      title: 'Expensive Good',
      price: 150,
      rating: 4.5,
    }),
  ]

  const test6_result = rankProducts(test6_products)
  const test6_cheapest = test6_result.find(p => p.badge === 'cheapest')
  const test6_passed = test6_cheapest?.id === 'p2'

  console.log(formatResult('Lowest price with rating >= 3.8 gets cheapest badge', test6_passed))
  totalTests++
  if (test6_passed) passedTests++

  // ===== Test 7: Priority - Best Choice Takes Precedence =====
  console.log('\n📋 Test 7: Priority - Best Choice Takes Precedence')

  const test7_products = [
    createProduct({
      id: 'p1',
      title: 'All-In-One Winner',
      score: 0.95,
      rating: 4.5,
      reviews_count: 100,
      price: 50, // Also cheapest
      shipping_time_days: 1, // Also fastest
    }),
  ]

  const test7_result = rankProducts(test7_products)
  const test7_badges = test7_result[0]?.badge
  const test7_passed = test7_badges === 'best_choice'

  console.log(formatResult('Best Choice takes priority over other categories', test7_passed))
  totalTests++
  if (test7_passed) passedTests++

  // ===== Test 8: Exclusivity =====
  console.log('\n📋 Test 8: Exclusivity - Each product gets max one badge')

  const test8_products = [
    createProduct({
      id: 'p1',
      score: 0.9,
      rating: 4.5,
      reviews_count: 100,
      price: 100,
      shipping_time_days: 5,
    }),
    createProduct({
      id: 'p2',
      score: 0.8,
      rating: 4.0,
      reviews_count: 50,
      price: 50,
      shipping_time_days: 2,
    }),
  ]

  const test8_result = rankProducts(test8_products)
  const test8_badgeCount = test8_result.filter(p => p.badge).length
  const test8_passed = test8_badgeCount >= 1 && test8_badgeCount <= 2

  console.log(formatResult('Each product has at most one badge', test8_passed))
  totalTests++
  if (test8_passed) passedTests++

  // ===== Test 9: Determinism =====
  console.log('\n📋 Test 9: Determinism')

  const test9_products = [
    createProduct({ id: 'p1', score: 0.8, rating: 4.5, reviews_count: 100 }),
    createProduct({ id: 'p2', score: 0.7, rating: 4.2, reviews_count: 60 }),
  ]

  const test9_result1 = rankProducts([...test9_products])
  const test9_result2 = rankProducts([...test9_products])
  const test9_passed =
    JSON.stringify(test9_result1.map(p => p.badge)) ===
    JSON.stringify(test9_result2.map(p => p.badge))

  console.log(formatResult('Same input produces same output (deterministic)', test9_passed))
  totalTests++
  if (test9_passed) passedTests++

  // ===== Test 10: Empty List =====
  console.log('\n📋 Test 10: Edge Case - Empty List')

  const test10_result = rankProducts([])
  const test10_passed = test10_result.length === 0

  console.log(formatResult('Empty product list returns empty result', test10_passed))
  totalTests++
  if (test10_passed) passedTests++

  // ===== Summary =====
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Test Summary: ${passedTests}/${totalTests} tests passed`)

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Phase 3 ranking logic is working correctly.')
    process.exit(0)
  } else {
    console.log(
      `\n⚠️  ${totalTests - passedTests} test(s) failed. Please review the implementation.`
    )
    process.exit(1)
  }
}

main()
