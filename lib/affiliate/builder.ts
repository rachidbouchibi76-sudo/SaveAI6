/**
 * Affiliate Link Builder Service
 * Pure function to generate tracking URLs
 * Does NOT affect product selection or recommendations
 */

import { AffiliateLink, AffiliateLinkResult, AffiliateConfig, ProductForAffiliate } from './types'
import { loadAffiliateConfig } from './config'

/**
 * Extract Amazon ASIN from URL
 */
function extractAmazonASIN(url: string): string | null {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/i)
  if (!match) return null
  return (match[1] || match[2]) as string
}

/**
 * Extract numeric product ID from URL
 */
function extractNumericId(url: string): string | null {
  const match = url.match(/(\d+)(?:\.html)?(?:$|\?|#)/)
  return match ? match[1] : null
}

/**
 * Check if string is a valid URL
 */
function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s)
}

/**
 * Extract product ID from URL based on platform
 */
function extractProductId(platform: string, input: string): string | null {
  if (!isUrl(input)) {
    return input // Already a product ID
  }

  const platformLower = platform.toLowerCase()

  if (platformLower === 'amazon') {
    return extractAmazonASIN(input)
  }

  // Generic numeric ID extraction for other platforms
  return extractNumericId(input)
}

/**
 * Build affiliate link for a product
 * Pure function - no side effects
 * Failure-safe: returns original URL if affiliate config missing
 */
export function buildAffiliateLink(
  platform: string,
  productIdOrUrl: string,
  config?: AffiliateConfig
): AffiliateLinkResult {
  try {
    const cfg = config || loadAffiliateConfig()
    const platformLower = platform.toLowerCase()

    // Check if affiliate system is enabled globally
    if (!cfg.enabled) {
      return {
        success: true,
        data: {
          platform: platformLower,
          productId: productIdOrUrl,
          finalUrl: productIdOrUrl,
          generatedAt: new Date(),
          affiliateId: 'disabled',
        },
      }
    }

    // Get platform-specific config
    const platformConfig = cfg.platforms[platformLower]
    if (!platformConfig || !platformConfig.enabled) {
      return {
        success: false,
        error: `No affiliate configuration for platform: ${platform}`,
        platform: platformLower,
      }
    }

    // Extract product ID
    const productId = extractProductId(platformLower, productIdOrUrl)
    if (!productId) {
      return {
        success: false,
        error: `Could not extract product ID from: ${productIdOrUrl}`,
        platform: platformLower,
      }
    }

    // Generate affiliate URL using template
    const affiliateUrl = platformConfig.linkTemplate
      .replace('{baseUrl}', platformConfig.baseUrl)
      .replace('{product_id}', encodeURIComponent(productId))
      .replace('{affiliate_id}', encodeURIComponent(platformConfig.affiliateId))

    return {
      success: true,
      data: {
        platform: platformLower,
        productId,
        finalUrl: affiliateUrl,
        generatedAt: new Date(),
        affiliateId: platformConfig.affiliateId,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Affiliate link generation failed: ${message}`,
      platform: platform.toLowerCase(),
    }
  }
}

/**
 * Batch build affiliate links for multiple products
 * Useful for generating links for final recommendations
 */
export function buildAffiliateLinks(
  products: ProductForAffiliate[],
  config?: AffiliateConfig
): Map<string, AffiliateLink> {
  const results = new Map<string, AffiliateLink>()

  products.forEach(product => {
    const result = buildAffiliateLink(product.platform, product.url || product.id, config)
    if (result.success) {
      results.set(product.id, result.data)
    }
  })

  return results
}

/**
 * Add affiliate URL to a product (non-mutating)
 * Returns a new product object with affiliateUrl field
 */
export function addAffiliateUrlToProduct<T extends ProductForAffiliate>(
  product: T,
  config?: AffiliateConfig
): T & { affiliateUrl: string } {
  const result = buildAffiliateLink(product.platform, product.url || product.id, config)
  const affiliateUrl = result.success ? result.data.finalUrl : product.url || product.id

  return {
    ...product,
    affiliateUrl,
  }
}
