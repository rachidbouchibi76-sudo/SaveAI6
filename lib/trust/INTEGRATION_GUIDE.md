/**
 * Phase 6 Integration Guide
 * Quick reference for integrating Trust Layer into the SaveAI pipeline
 */

/**
 * STEP 1: Import Trust Layer
 */

// In your API route or service:
import {
  enrichProductsWithTrustData,
  buildTrustContext,
  TrustLayerData,
} from '@/lib/trust'

/**
 * STEP 2: Enrich Recommended Products
 */

// Before:
// const recommended = recommendProducts(scoredProducts)
// return recommended

// After:
async function getSearchResults(query: string) {
  // ...existing search logic...
  const scored = scoreProducts(rawProducts)
  const recommended = recommendProducts(scored)
  
  // NEW: Enrich with trust data
  const trusted = enrichProductsWithTrustData(recommended)
  
  return trusted  // Now includes trustData field
}

/**
 * STEP 3: Format for API Response
 */

export async function GET(req: Request) {
  const products = await getSearchResults(query)
  
  const response = products.map(product => ({
    // Existing fields
    id: product.id,
    name: product.product_name,
    platform: product.platform,
    price: product.price,
    rating: product.rating,
    badge: product.badge,
    
    // NEW: Trust layer data
    trust: {
      labels: product.trustData.labels,
      explanation: product.trustData.explanation,
      confidence: product.trustData.confidence,
      cta: product.trustData.cta,
      risk: product.trustData.riskDisclosure.hasRisk ? {
        severity: product.trustData.riskDisclosure.severity,
        warnings: product.trustData.riskDisclosure.warnings,
        mitigation: product.trustData.riskDisclosure.mitigation,
      } : null,
    },
  }))
  
  return Response.json({ data: response })
}

/**
 * STEP 4: Use in React Component
 */

// components/ProductCard.tsx
interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    rating: number
    trust: TrustLayerData  // NEW type
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const { labels, explanation, confidence, cta, risk } = product.trust
  
  return (
    <div className="product-card">
      {/* Existing: Basic product info */}
      <h3>{product.name}</h3>
      <div className="price">${product.price}</div>
      
      {/* NEW: Trust badges */}
      <div className="badges">
        {labels.map(label => (
          <span key={label.label} className={`badge badge-${label.label}`}>
            {label.reason}
          </span>
        ))}
      </div>
      
      {/* NEW: Why we recommend this */}
      <div className={`explanation sentiment-${explanation.sentiment}`}>
        <p><strong>Why we picked this:</strong></p>
        <ul>
          {explanation.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>
      
      {/* NEW: Data quality indicator */}
      {confidence.level !== 'High' && (
        <div className={`confidence confidence-${confidence.level.toLowerCase()}`}>
          Missing: {confidence.missing.join(', ')}
        </div>
      )}
      
      {/* NEW: Optimized CTA */}
      <button 
        className={`cta-button cta-${cta.variant}`}
        title={cta.reason}
      >
        {cta.copy}
      </button>
      
      {/* NEW: Risk warning (if applicable) */}
      {risk && (
        <div className={`warning warning-${risk.severity}`}>
          <strong>⚠️ Heads up:</strong>
          <ul>
            {risk.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
          {risk.mitigation && (
            <p className="mitigation">💡 {risk.mitigation}</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * STEP 5: Testing
 */

// Run tests
// $ npm test __tests__/lib/trust

// Or test specific component
// $ npm test __tests__/lib/trust/index.test.ts

/**
 * STEP 6: Configuration (Optional)
 */

// Use custom thresholds per market segment:
import { enrichProductsWithTrustData } from '@/lib/trust'

const premiumMarketThresholds = {
  minRatingForSafe: 4.5,
  minReviewsForReliable: 200,
  minReviewsForChosen: 50,
  ValueScoreThreshold: 0.7,
  mostReviewedPercentile: 90,
  lowRatingThreshold: 4.0,
  lowReviewThreshold: 20,
}

const budgetMarketThresholds = {
  minRatingForSafe: 3.0,
  minReviewsForReliable: 10,
  minReviewsForChosen: 1,
  ValueScoreThreshold: 0.3,
  mostReviewedPercentile: 50,
  lowRatingThreshold: 2.5,
  lowReviewThreshold: 1,
}

// In your API:
const trusted = isPremiumMarket
  ? enrichProductsWithTrustData(recommended, premiumMarketThresholds)
  : enrichProductsWithTrustData(recommended, budgetMarketThresholds)

/**
 * STEP 7: A/B Testing (Optional)
 */

import { withoutTrustData } from '@/lib/trust'

export function getProductsWithVariant(products: any[], variant: string) {
  if (variant === 'control') {
    // Remove trust data for control group
    return products.map(withoutTrustData)
  } else if (variant === 'enhanced_labels') {
    // Show only primary label
    return products.map(p => ({
      ...p,
      trust: {
        labels: [p.trust.labels[0]],
        cta: p.trust.cta,
      },
    }))
  } else if (variant === 'enhanced_full') {
    // Show all trust signals (default)
    return products
  }
}

/**
 * PERFORMANCE CHECKLIST
 */

// If >1000 products per query:
// - Consider caching trust calculations
// - Batch process in chunks of 100
// - Example:
//   ```
//   const batchSize = 100
//   const batches = chunk(recommended, batchSize)
//   const trusted = batches
//     .map(batch => enrichProductsWithTrustData(batch))
//     .flat()
//   ```

/**
 * TROUBLESHOOTING
 */

// Issue: Missing trustData on product
// Fix: Ensure enrichProductsWithTrustData() is called
// Debug: Check canApplyTrustLayer(product) first

// Issue: Unusual trust labels
// Fix: Check product data completeness
// Debug: Log generateConfidenceIndicator(product)

// Issue: Inconsistent CTA text
// Fix: Verify product.badge and product.is_risky
// Debug: Log selectCTAVariant(product)

// Issue: Risk warnings not showing
// Fix: Check if needsTrustWarning(product, context) returns true
// Debug: Log generateRiskDisclosure(product, context)

/**
 * FILE CHECKLIST
 */

// ✓ lib/trust/types.ts
//   → All type definitions for trust layer

// ✓ lib/trust/trustLabelsEngine.ts
//   → generateTrustLabels(product, context): TrustLabelDisplay[]

// ✓ lib/trust/recommendationExplainer.ts
//   → generateRecommendationExplanation(product, context): RecommendationExplanation

// ✓ lib/trust/confidenceIndicator.ts
//   → generateConfidenceIndicator(product): ConfidenceIndicator

// ✓ lib/trust/ctaOptimizer.ts
//   → generateOptimizedCTA(product): OptimizedCTA

// ✓ lib/trust/riskDisclosure.ts
//   → generateRiskDisclosure(product, context): RiskDisclosure

// ✓ lib/trust/index.ts
//   → Main orchestration & entry point

// ✓ __tests__/lib/trust/index.test.ts
//   → 33+ test cases covering all scenarios

// ✓ lib/trust/example.ts
//   → 8 complete integration examples

/**
 * ROLLOUT PLAN
 */

// Phase 1 (Day 1): Deploy trust layer with control variant
// - 50% control (no trust data), 50% enhanced

// Phase 2 (Day 2-4): Monitor metrics
// - CTR, conversion rate, user scroll engagement
// - Watch for performance issues

// Phase 3 (Day 5+): Gradual rollout to full enhanced
// - 75% enhanced variant, 25% control
// - Finalize A/B metrics

// Phase 4 (Week 2+): Full deployment
// - 100% with trust layer enabled by default

/**
 * EXPECTED OUTCOMES
 */

// User Trust Signals:
// ✓ Labels explain why product recommended
// ✓ Explanation in user-friendly language
// ✓ Confidence indicator honest about data
// ✓ Warnings prevent buyer's remorse
// ✓ CTA optimized for conversion

// Business Impact:
// - Improved CTR (5-15% est.)
// - Higher conversion (3-10% est.)
// - Reduced returns (2-5% est.)
// - Better user satisfaction (trust survey)

export default {
  integrated: true,
  complexity: 'low',
  riskLevel: 'minimal',
  rolloutReady: true,
}
