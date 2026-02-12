/**
 * Affiliate System Type Definitions
 * Decoupled data structures for affiliate link generation
 * No business logic - pure data models
 */

/**
 * Supported affiliate platforms (extensible)
 */
export type PlatformName = 'amazon' | 'shein' | 'aliexpress' | string

/**
 * Platform-specific affiliate configuration
 * All values come from environment variables or secure config
 */
export interface AffiliatePlatform {
  platform: string // lowercase identifier
  baseUrl: string // https://platform.com
  affiliateId: string // tracking/commission ID
  linkTemplate: string // template with {product_id} and {affiliate_id}
  enabled: boolean // can be disabled without breaking system
}

/**
 * Configuration for all affiliate platforms
 */
export interface AffiliateConfig {
  enabled: boolean // master switch
  platforms: Record<string, AffiliatePlatform>
}

/**
 * Generated affiliate link with full metadata
 */
export interface AffiliateLink {
  platform: string
  productId: string
  finalUrl: string
  generatedAt: Date
  affiliateId: string // for auditing
}

/**
 * Result of affiliate link generation
 */
export type AffiliateLinkResult =
  | { success: true; data: AffiliateLink }
  | { success: false; error: string; platform: string }

/**
 * Product object for affiliate link generation
 * (minimal subset of Product interface)
 */
export interface ProductForAffiliate {
  id: string
  url: string
  platform: string
  title?: string
  price?: number
}
