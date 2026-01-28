# SaveAI Phase 1: Foundational Architecture

## Overview

This document describes the foundational architecture implemented in Phase 1. This phase establishes clean contracts and interfaces without implementing business logic, file reading, or API integrations.

## Implemented Components

### 1. Unified Product Schema (`/lib/types/product.ts`)

**Purpose**: Store-agnostic data model for price comparison

**Key Features**:
- JSON serializable
- Deterministic structure
- Supports price comparison, ratings, reviews, shipping
- Extensible metadata field for provider-specific data
- Affiliate URL support

**Core Interface**: `Product`

```typescript
interface Product {
  id: string
  name: string
  price: number
  currency: string
  originalPrice?: number
  savings?: number
  savingsPercent?: number
  image?: string
  url: string
  store: string
  rating?: number
  reviews?: number
  shipping?: {...}
  affiliateUrl?: string
  category?: string
  brand?: string
  description?: string
  metadata?: Record<string, any>
}
```

### 2. Search Input Contract (`/lib/types/product.ts`)

**Purpose**: Represents extracted product data and user intent

**Key Features**:
- Supports both URL and keyword queries
- Optional extracted product data (from Manus)
- User constraints (price range, categories, similarity threshold)
- Context information (userId, sessionId)

**Core Interface**: `SearchInput`

```typescript
interface SearchInput {
  query: string
  type: 'url' | 'keyword'
  extractedProduct?: {...}
  constraints?: {...}
  userId?: string
  sessionId?: string
}
```

### 3. ProductProvider Interface (`/lib/providers/ProductProvider.ts`)

**Purpose**: Abstract contract for all product data sources

**Design Principles**:
- Returns raw candidate products only
- NO business logic (scoring, ranking, filtering)
- NO dependencies on other providers
- Fully interchangeable implementations

**Core Interface**: `ProductProvider`

```typescript
interface ProductProvider {
  readonly name: string
  readonly type: 'file' | 'api'
  readonly store: string
  
  search(input: SearchInput): Promise<ProviderSearchResult>
  isAvailable(): Promise<boolean>
}
```

**Base Class**: `BaseProductProvider`
- Provides common functionality
- Abstract `normalizeProduct()` method for data transformation

### 4. File Provider Implementations

#### AmazonFileProvider (`/lib/providers/AmazonFileProvider.ts`)
- Implements `ProductProvider` interface
- Placeholder for Phase 2 file reading
- Includes `normalizeProduct()` for Amazon data format

#### SheinFileProvider (`/lib/providers/SheinFileProvider.ts`)
- Implements `ProductProvider` interface
- Placeholder for Phase 2 file reading
- Includes `normalizeProduct()` for Shein data format

**Phase 1 Status**: Both return empty results and `isAvailable() = false`

### 5. Provider Resolver (`/lib/resolver/ProviderResolver.ts`)

**Purpose**: Configuration-driven provider selection and management

**Key Features**:
- Environment variable based enable/disable
- Priority-based provider ordering
- NO hardcoded store logic
- Extensible for new providers

**Configuration**:
```typescript
interface ResolverConfig {
  providers: {
    [key: string]: {
      enabled: boolean
      priority?: number
      options?: Record<string, any>
    }
  }
}
```

**Environment Variables**:
- `ENABLE_AMAZON_FILE=true` - Enable Amazon file provider
- `ENABLE_SHEIN_FILE=true` - Enable Shein file provider
- `AMAZON_DATA_FILE=/data/amazon-products.json` - Amazon data file path
- `SHEIN_DATA_FILE=/data/shein-products.json` - Shein data file path

**Key Methods**:
- `getAvailableProviders()` - Returns all enabled and available providers
- `getProvider(name)` - Get specific provider by name
- `getProvidersByStore(store)` - Get providers for a specific store
- `hasAvailableProviders()` - Check if any providers are available

**Singleton Pattern**:
```typescript
const resolver = getProviderResolver()
```

## Folder Structure

```
/lib/
├── types/
│   ├── product.ts          # Unified Product schema and SearchInput
│   └── index.ts            # Type exports
├── providers/
│   ├── ProductProvider.ts  # Interface and base class
│   ├── AmazonFileProvider.ts
│   ├── SheinFileProvider.ts
│   └── index.ts            # Provider exports
└── resolver/
    ├── ProviderResolver.ts # Provider selection and management
    └── index.ts            # Resolver exports
```

## Provider Independence Rules

✅ **Enforced**:
- Providers do not depend on each other
- Providers do not know about scoring or ranking
- Providers are interchangeable
- Business logic is separate from data access

## Integration Points (Phase 2+)

### Current API Route
`/app/api/search/route.ts` - Currently implements its own logic

### Future Integration
The route should become an **Orchestrator** that:
1. Receives request
2. Calls `ProviderResolver.getAvailableProviders()`
3. Calls `provider.search()` for each provider
4. Passes results to Matching Engine (Phase 2)
5. Passes results to Scoring Engine (Phase 2)
6. Conditionally calls OpenAI (Phase 2)
7. Applies Affiliate Layer (Phase 2)

## What's NOT Implemented (By Design)

❌ File reading logic
❌ API integrations
❌ Matching engine
❌ Scoring engine
❌ OpenAI integration
❌ Affiliate URL building
❌ Business logic
❌ UI modifications

## Phase 2 Readiness

This architecture is ready for:
- ✅ File-based provider implementation
- ✅ API-based provider implementation
- ✅ Matching engine integration
- ✅ Scoring engine integration
- ✅ Easy addition of new providers (AliExpress, Temu, etc.)

## Usage Example (Phase 2+)

```typescript
import { getProviderResolver } from '@/lib/resolver'
import { SearchInput } from '@/lib/types'

// Get resolver instance
const resolver = getProviderResolver()

// Check if providers are available
const hasProviders = await resolver.hasAvailableProviders()

if (hasProviders) {
  // Get all available providers
  const providers = await resolver.getAvailableProviders()
  
  // Create search input
  const input: SearchInput = {
    query: 'wireless headphones',
    type: 'keyword',
    constraints: {
      maxPrice: 100,
      minRating: 4.0
    }
  }
  
  // Search across all providers
  const results = await Promise.all(
    providers.map(provider => provider.search(input))
  )
  
  // Results are now ready for matching and scoring
}
```

## Testing

Phase 1 includes placeholder implementations that:
- Compile without errors
- Follow TypeScript best practices
- Return empty/default values
- Are ready for Phase 2 implementation

## Next Steps (Phase 2)

1. Implement file reading in `AmazonFileProvider` and `SheinFileProvider`
2. Create basic matching engine (`/lib/matching/matchProducts.ts`)
3. Create basic scoring engine (`/lib/scoring/scoreProducts.ts`)
4. Refactor `/app/api/search/route.ts` to use the new architecture
5. Add data files (`/data/amazon-products.json`, `/data/shein-products.json`)

## Configuration

Add to `.env.local`:
```env
# Provider Configuration
ENABLE_AMAZON_FILE=true
ENABLE_SHEIN_FILE=true
AMAZON_DATA_FILE=/data/amazon-products.json
SHEIN_DATA_FILE=/data/shein-products.json
```

## Conclusion

Phase 1 establishes a clean, extensible foundation that:
- ✅ Separates concerns properly
- ✅ Allows easy provider addition/removal
- ✅ Supports both file and API sources
- ✅ Maintains provider independence
- ✅ Provides clear contracts for all components
- ✅ Ready for Phase 2 implementation