/**
 * Example Usage: Affiliate System Integration
 * Shows how to add affiliate links to final recommended products
 * After scoring, ranking, and guardrails filtering
 */

import {
  buildAffiliateLink,
  buildAffiliateLinks,
  addAffiliateUrlToProduct,
  type ProductForAffiliate,
} from '@/lib/affiliate'
import { type RecommendedProduct } from '@/lib/recommendation'

/**
 * Example 1: Add affiliate URL to a single recommended product
 * Use this in API responses or before sending to frontend
 */
export function example1_enrichSingleProduct() {
  // This is a product that passed:
  // Phase 2: Scoring
  // Phase 3: Ranking (has badge)
  // Phase 4: Guardrails (verified and not risky)
  // Phase 5: NOW adding affiliate link

  const recommendedProduct: RecommendedProduct = {
    id: 'amazon-B08EXAMPLE',
    platform: 'amazon',
    title: 'Premium Wireless Headphones',
    price: 99.99,
    currency: 'USD',
    url: 'https://www.amazon.com/dp/B08EXAMPLE',
    rating: 4.8,
    reviews_count: 5000,
    badge: 'best_choice', // From Phase 3 ranking
    isRecommended: true, // From Phase 4 guardrails
    reasoning_tags: ['Top Rated by Thousands', 'Category Winner: Best Choice'],
    is_risky: false,
    risk_reasons: [],
  }

  // Add affiliate URL (pure function, doesn't modify original)
  const enrichedProduct = addAffiliateUrlToProduct(recommendedProduct)

  console.log('✅ Product enriched with affiliate URL:')
  console.log({
    title: enrichedProduct.title,
    affiliateUrl: enrichedProduct.affiliateUrl,
    badge: enrichedProduct.badge,
  })

  return enrichedProduct
}

/**
 * Example 2: Batch add affiliate links to multiple final recommendations
 * Use this when preparing search results or category pages
 */
export function example2_enrichMultipleProducts() {
  // Imagine these are the final 3 recommended products at the top of results
  const finalRecommendations: RecommendedProduct[] = [
    {
      id: 'amazon-B001',
      platform: 'amazon',
      title: 'Product 1',
      price: 29.99,
      currency: 'USD',
      url: 'https://www.amazon.com/dp/B001',
      rating: 4.7,
      reviews_count: 2500,
      isRecommended: true,
      is_risky: false,
    },
    {
      id: 'shein-12345',
      platform: 'shein',
      title: 'Product 2',
      price: 19.99,
      currency: 'USD',
      url: 'https://us.shein.com/product/12345.html',
      rating: 4.2,
      reviews_count: 150,
      isRecommended: true,
      is_risky: false,
    },
    {
      id: 'amazon-B002',
      platform: 'amazon',
      title: 'Product 3',
      price: 49.99,
      currency: 'USD',
      url: 'https://www.amazon.com/dp/B002',
      rating: 4.5,
      reviews_count: 1200,
      badge: 'best_value',
      isRecommended: true,
      is_risky: false,
    },
  ]

  // Convert to affiliate format
  const productsForAffiliate: ProductForAffiliate[] = finalRecommendations.map(p => ({
    id: p.id,
    url: p.url,
    platform: p.platform,
    title: p.title,
    price: p.price,
  }))

  // Batch generate affiliate links
  const affiliateLinks = buildAffiliateLinks(productsForAffiliate)

  // Enrich products with affiliate URLs
  const enrichedProducts = finalRecommendations.map(product => {
    const link = affiliateLinks.get(product.id)
    return {
      ...product,
      affiliateUrl: link?.finalUrl || product.url,
    }
  })

  console.log('✅ Batch enriched recommendations:')
  enrichedProducts.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} → ${p.affiliateUrl}`)
  })

  return enrichedProducts
}

/**
 * Example 3: Generate affiliate link with error handling
 * Use this when you need to handle failures gracefully
 */
export function example3_generateWithErrorHandling() {
  const products: ProductForAffiliate[] = [
    {
      id: 'p1',
      platform: 'amazon',
      url: 'https://www.amazon.com/dp/B08EXAMPLE',
    },
    {
      id: 'p2',
      platform: 'unsupported-platform', // This will fail
      url: 'https://unsupported.com/product/123',
    },
    {
      id: 'p3',
      platform: 'shein',
      url: 'https://us.shein.com/product/54321.html',
    },
  ]

  console.log('✅ Generating affiliate links with error handling:')

  products.forEach(product => {
    const result = buildAffiliateLink(product.platform, product.url)

    if (result.success) {
      console.log(`  ✓ ${product.id}: ${result.data.finalUrl}`)
    } else {
      console.log(`  ✗ ${product.id}: ${result.error}`)
      // Fallback: use original URL
      console.log(`    Fallback: ${product.url}`)
    }
  })
}

/**
 * Example 4: Integration point in API response
 * Shows how to structure the final API response with affiliate links
 */
export function example4_apiResponseWithAffiliateLinks() {
  // This is what your search API would return
  const searchResponse = {
    query: 'wireless headphones',
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        id: 'amazon-B08EXAMPLE',
        rank: 1,
        title: 'Premium Wireless Headphones',
        price: 99.99,
        rating: 4.8,
        badge: 'best_choice',
        affiliateUrl: 'https://www.amazon.com/dp/B08EXAMPLE?tag=YOUR_AFFILIATE_ID',
        reasoning: [
          'Top Rated by Thousands',
          'Category Winner: Best Choice',
          'Trusted Seller Platform',
        ],
      },
      {
        id: 'shein-12345',
        rank: 2,
        title: 'Budget Wireless Earbuds',
        price: 15.99,
        rating: 4.1,
        badge: 'cheapest',
        affiliateUrl: 'https://us.shein.com/product/12345.html?aff=YOUR_AFFILIATE_ID',
        reasoning: ['Good Deal', 'Free Shipping', 'Category Winner: Cheapest'],
      },
    ],
    explanation: {
      methodology: 'Products ranked by quality + value + trust signals',
      trustScore: 'Based on ratings, reviews count, and platform reliability',
      affiliation: 'Links may include affiliate tracking',
    },
  }

  return searchResponse
}

/**
 * Example 5: Conditional affiliate generation based on product quality
 * Only generate affiliate links for verified products
 */
export function example5_conditionalAffiliateGeneration() {
  const products: RecommendedProduct[] = [
    {
      id: 'p1',
      platform: 'amazon',
      url: 'https://www.amazon.com/dp/B001',
      title: 'Good Product',
      price: 50,
      currency: 'USD',
      rating: 4.7,
      reviews_count: 1000,
      isRecommended: true, // ✅ VERIFIED
      is_risky: false,
    },
    {
      id: 'p2',
      platform: 'amazon',
      url: 'https://www.amazon.com/dp/B002',
      title: 'Sketchy Product',
      price: 5,
      currency: 'USD',
      rating: 2.1,
      reviews_count: 3,
      isRecommended: false, // ❌ NOT VERIFIED
      is_risky: true,
      risk_reasons: ['Rating below threshold', 'Suspiciously cheap'],
    },
  ]

  console.log('✅ Conditional affiliate generation:')

  products.forEach(product => {
    if (product.isRecommended && !product.is_risky) {
      // Generate affiliate link for verified products
      const result = buildAffiliateLink(product.platform, product.url)
      if (result.success) {
        console.log(`  ✓ ${product.title}: ${result.data.finalUrl}`)
      }
    } else {
      // For risky products, use original URL (no affiliate revenue)
      console.log(`  ⚠️ ${product.title}: ${product.url} (unverified, no affiliation)`)
    }
  })
}

/**
 * Example 6: Complete pipeline from search to affiliate URLs
 * Shows the full flow: Query → Score → Rank → Guardrail → Affiliate
 */
export function example6_completePipeline() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║               SaveAI - Complete Product Pipeline              ║
╚═══════════════════════════════════════════════════════════════╝

Step 1: Raw Products from Data Sources
  ├─ Amazon: 1000 headphones listings
  ├─ Shein: 500 accessories listings
  └─ AliExpress: 2000 tech product listings
                              ↓
Step 2: Phase 2 - Scoring Engine
  ├─ Normalize pricing data
  ├─ Calculate trust scores (rating × reviews)
  └─ Result: 3500 scored products
                              ↓
Step 3: Phase 3 - Ranking Engine
  ├─ Rank within categories
  ├─ Award badges (best_choice, best_value, fastest, cheapest)
  └─ Result: 3500 ranked products with badges
                              ↓
Step 4: Phase 4 - Guardrails (Smart Filtering)
  ├─ Minimum Quality Floor (rating ≥ 4.0)
  ├─ Social Proof Threshold (reviews ≥ 10)
  ├─ Anti-Scam Price Check (no outlier prices)
  └─ Result: 2100 verified products (60% passed quality gates)
                              ↓
Step 5: Phase 5 - Affiliate Links (NEW)
  ├─ For each recommended product, generate tracking URL
  ├─ Add affiliate ID to maintain recommendation integrity
  ├─ Fallback gracefully if config missing
  └─ Result: Products with affiliate tracking URLs
                              ↓
Output: Final API Response
  {
    "recommendation": {
      "title": "Premium Headphones",
      "price": "$99.99",
      "badge": "best_choice",
      "rating": "4.8/5 (5000 reviews)",
      "reasons": ["Top Rated", "Best Choice"],
      "buyUrl": "https://amazon.com/dp/B08EXAMPLE?tag=saveai"
    }
  }
  `)
}

/**
 * Traditional example for backwards compatibility
 */
export function exampleAfterRanking() {
  const finalProduct = {
    platform: 'amazon',
    url: 'https://www.amazon.com/dp/B08N5WRWNW',
  }

  const link = buildAffiliateLink(finalProduct.platform, finalProduct.url)
  return link
}

// Run all examples (comment/uncomment as needed)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('\n=== AFFILIATE SYSTEM EXAMPLES ===\n')

  example1_enrichSingleProduct()
  console.log('\n---\n')

  example2_enrichMultipleProducts()
  console.log('\n---\n')

  example3_generateWithErrorHandling()
  console.log('\n---\n')

  console.log('\n=== API RESPONSE STRUCTURE ===\n')
  console.log(JSON.stringify(example4_apiResponseWithAffiliateLinks(), null, 2))
  console.log('\n---\n')

  example5_conditionalAffiliateGeneration()
  console.log('\n---\n')

  example6_completePipeline()
}

export default {
  example1_enrichSingleProduct,
  example2_enrichMultipleProducts,
  example3_generateWithErrorHandling,
  example4_apiResponseWithAffiliateLinks,
  example5_conditionalAffiliateGeneration,
  example6_completePipeline,
  exampleAfterRanking,
}
