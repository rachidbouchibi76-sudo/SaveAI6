/**
 * Unified Product Schema
 * Store-agnostic data model for price comparison across all providers
 * JSON serializable and deterministic
 */
export interface Product {
  // Core identification
  id: string
  platform: string // source platform e.g. 'amazon', 'shein'
  title: string

  // Pricing
  price: number
  currency: string
  originalPrice?: number
  savings?: number
  savingsPercent?: number

  // Shipping (flattened)
  shipping_price?: number
  shipping_time_days?: number

  // Media
  image?: string

  // Source
  url: string

  // Quality indicators
  rating?: number
  reviews_count?: number

  // Affiliate
  affiliateUrl?: string

  // Metadata
  category?: string
  brand?: string
  description?: string

  // Provider-specific data (extensible)
  metadata?: Record<string, any>

  // Ranking badge (Phase 3)
  badge?: 'best_choice' | 'best_value' | 'fastest' | 'cheapest'

  // Guardrails & Trust Metrics (Phase 4)
  isRecommended?: boolean
  reasoning_tags?: string[]
  is_risky?: boolean
  risk_reasons?: string[]
}

/**
 * Search Input Contract
 * Represents extracted product data and user intent
 */
export interface SearchInput {
  // Core query
  query: string
  
  // Query type
  type: 'url' | 'keyword'
  
  // Extracted product data (from Manus or URL parsing)
  extractedProduct?: {
    name?: string
    price?: number
    category?: string
    brand?: string
    store?: string
  }
  
  // User constraints
  constraints?: {
    maxPrice?: number
    minPrice?: number
    minRating?: number
    categories?: string[]
    stores?: string[]
    similarityThreshold?: number
  }
  
  // Context
  userId?: string
  sessionId?: string
}

/**
 * Provider Search Result
 * Raw response from a single provider
 */
export interface ProviderSearchResult {
  provider: string
  products: Product[]
  metadata?: {
    totalResults?: number
    searchTime?: number
    apiVersion?: string
  }
}