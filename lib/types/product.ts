/**
 * Unified Product Schema
 * Store-agnostic data model for price comparison across all providers
 * JSON serializable and deterministic
 */
export interface Product {
  // Core identification
  id: string
  name: string
  
  // Pricing
  price: number
  currency: string
  originalPrice?: number
  savings?: number
  savingsPercent?: number
  
  // Media
  image?: string
  
  // Source
  url: string
  store: string
  
  // Quality indicators
  rating?: number
  reviews?: number
  
  // Optional features
  shipping?: {
    cost?: number
    estimatedDays?: number
    isFree?: boolean
  }
  
  // Affiliate
  affiliateUrl?: string
  
  // Metadata
  category?: string
  brand?: string
  description?: string
  
  // Provider-specific data (extensible)
  metadata?: Record<string, any>
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