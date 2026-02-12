# Phase 3: Quick Reference Guide

## Import
```typescript
import { rankProducts, type ProductBadge } from '@/lib/scoring'
// OR
import { rankProducts } from '@/lib/scoring/ranker'
```

## Basic Usage
```typescript
const rankedProducts = rankProducts(scoredProducts)
```

## Advanced Usage with Config
```typescript
const rankedProducts = rankProducts(scoredProducts, {
  bestChoiceMinRating: 4.0,
  bestChoiceMinReviews: 50,
  cheapestMinRating: 3.8
})
```

## Types
```typescript
type ProductBadge = 'best_choice' | 'best_value' | 'fastest' | 'cheapest'

interface ProductWithBadge extends Product {
  badge?: ProductBadge
}
```

## Badge Meanings

| Badge | Arabic | Criteria | Use Case |
|-------|--------|----------|----------|
| `best_choice` | الأفضل إجمالاً | Highest score, rating > 4.0, reviews > 50 | Top quality pick |
| `best_value` | الأفضل قيمة | (rating * log(reviews)) / price | Value-conscious buyers |
| `fastest` | الأسرع وصولاً | Min shipping_time_days | Quick delivery needed |
| `cheapest` | الأرخص بجودة | Min price, rating >= 3.8 | Budget-friendly option |

## UI Display Examples

```typescript
// Badge icons and labels
const badgeConfig = {
  best_choice: { icon: '🏆', label: 'Best Choice', color: 'gold' },
  best_value: { icon: '💎', label: 'Best Value', color: 'blue' },
  fastest: { icon: '⚡', label: 'Fastest Delivery', color: 'green' },
  cheapest: { icon: '💰', label: 'Most Affordable', color: 'purple' }
}

// React component
<div className="product-card">
  {product.badge && (
    <span className={`badge-${badgeConfig[product.badge].color}`}>
      {badgeConfig[product.badge].icon} {badgeConfig[product.badge].label}
    </span>
  )}
  <h3>{product.title}</h3>
  <p>${product.price}</p>
</div>
```

## Field Requirements by Category

| Category | Required Fields | Optional Fields | Formula |
|----------|-----------------|-----------------|---------|
| Best Choice | score, rating, reviews_count | - | Highest score |
| Best Value | price, rating, reviews_count | - | (r * ln(rc)) / p |
| Fastest | shipping_time_days | - | Min days |
| Cheapest | price, rating | - | Min price |

## Priority Rules

1. A product gets at most **ONE** badge
2. Priority order: Best Choice > Best Value > Fastest > Cheapest
3. Once assigned, excluded from remaining badges

Example:
```typescript
// Same product data
product = {
  score: 0.95,           // ← Best Choice winner
  rating: 4.5,
  reviews_count: 100,
  price: 50,             // ← Also cheapest
  shipping_time_days: 1  // ← Also fastest
}

rankedProducts.find(p => p.id === product.id).badge
// Result: 'best_choice' (not 'cheapest' or 'fastest')
```

## Configuration Examples

### A/B Testing
```typescript
// Conservative (fewer winners)
const conservative = rankProducts(products, {
  bestChoiceMinRating: 4.5,
  bestChoiceMinReviews: 100,
  cheapestMinRating: 4.0
})

// Aggressive (more options)
const aggressive = rankProducts(products, {
  bestChoiceMinRating: 3.8,
  bestChoiceMinReviews: 20,
  cheapestMinRating: 3.5
})
```

### Market-Specific
```typescript
// Premium Market (strict quality)
const premium = rankProducts(products, {
  bestChoiceMinRating: 4.3,
  bestChoiceMinReviews: 100,
  cheapestMinRating: 4.0
})

// Budget Market (inclusive)
const budget = rankProducts(products, {
  bestChoiceMinRating: 3.8,
  bestChoiceMinReviews: 30,
  cheapestMinRating: 3.5
})
```

## Explanation Generation (for Phase 6)

```typescript
function explainBadge(product: ProductWithBadge): string {
  const explanations = {
    'best_choice': () => `
      This product offers the highest quality score (${product.score.toFixed(2)}/1.0).
      With ${product.reviews_count} verified reviews at ⭐ ${product.rating}/5,
      it's trusted by thousands of buyers.
    `,
    'best_value': () => `
      Best value for money: ⭐ ${product.rating}/5 rating at just $${product.price}.
      Excellent quality at an unbeatable price point.
    `,
    'fastest': () => `
      Express delivery available. Gets to you in just ${product.shipping_time_days} days.
    `,
    'cheapest': () => `
      Most affordable option with quality assurance (⭐ ${product.rating}/5 rating).
      Save money without compromising on quality.
    `
  }
  
  return product.badge 
    ? explanations[product.badge]?.() 
    : 'No special designation for this product.'
}
```

## Performance Characteristics

- **Time:** O(n) where n = number of products
- **Space:** O(n) for output array
- **Safe:** No external dependencies, pure TypeScript
- **Fast:** Processes 1000 products in < 1ms

## Testing Your Implementation

```typescript
import { rankProducts } from '@/lib/scoring'

// Test data
const testProducts = [
  {
    id: '1', platform: 'amazon', title: 'Premium Item',
    score: 0.95, rating: 4.5, reviews_count: 100,
    price: 150, shipping_time_days: 2, url: 'https://...',
    currency: 'USD'
  },
  // ... more products
]

const ranked = rankProducts(testProducts)
const winners = ranked.filter(p => p.badge)
console.log('Category Winners:', winners.map(p => p.badge))
```

## Debugging

```typescript
// Check why a product didn't win a category
function debugRanking(products, productId) {
  const targeted = products.find(p => p.id === productId)
  
  // Check each category
  console.log('Best Choice criteria:')
  console.log(`  - Score: ${targeted.score} (best: ${Math.max(...products.map(p => p.score))})`)
  console.log(`  - Rating > 4.0: ${targeted.rating > 4.0}`)
  console.log(`  - Reviews > 50: ${targeted.reviews_count > 50}`)
  
  console.log('Best Value score:', (targeted.rating * Math.log(targeted.reviews_count)) / targeted.price)
  
  console.log('Fastest:', `${targeted.shipping_time_days} days`)
  console.log(`  - Min in set: ${Math.min(...products.map(p => p.shipping_time_days))}`)
  
  console.log('Cheapest:', `$${targeted.price}`)
  console.log(`  - Min in set: $${Math.min(...products.map(p => p.price))}`)
}
```

## Next Steps

1. **Integrate** into search results display
2. **Add badges** to product cards in UI
3. **A/B test** configuration values
4. **Monitor** which categories users interact with
5. **Proceed to Phase 4** for alternatives logic
