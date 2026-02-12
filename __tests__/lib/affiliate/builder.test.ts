/**
 * Comprehensive tests for affiliate system
 * Covers configuration loading, URL building, and error handling
 * No dependencies on scoring, ranking, or recommendation logic
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import {
  buildAffiliateLink,
  buildAffiliateLinks,
  addAffiliateUrlToProduct,
  loadAffiliateConfig,
  validateConfig,
  getAffiliateConfigOrThrow,
  type AffiliateConfig,
  type ProductForAffiliate,
} from '../affiliate'

describe('Affiliate System', () => {
  const mockConfig: AffiliateConfig = {
    enabled: true,
    platforms: {
      amazon: {
        platform: 'amazon',
        baseUrl: 'https://www.amazon.com',
        affiliateId: 'test-id-123',
        linkTemplate: '{baseUrl}/dp/{product_id}?tag={affiliate_id}',
        enabled: true,
      },
      shein: {
        platform: 'shein',
        baseUrl: 'https://us.shein.com',
        affiliateId: 'shein-aff-456',
        linkTemplate: '{baseUrl}/product/{product_id}.html?aff={affiliate_id}',
        enabled: true,
      },
      aliexpress: {
        platform: 'aliexpress',
        baseUrl: 'https://www.aliexpress.com',
        affiliateId: 'zg-aff-789',
        linkTemplate: '{baseUrl}/item/{product_id}.html?aff={affiliate_id}',
        enabled: true,
      },
    },
  }

  describe('buildAffiliateLink', () => {
    it('should build Amazon affiliate link with ASIN', () => {
      const result = buildAffiliateLink('amazon', 'B08EXAMPLE', mockConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.finalUrl).toContain('B08EXAMPLE')
        expect(result.data.finalUrl).toContain('test-id-123')
        expect(result.data.platform).toBe('amazon')
      }
    })

    it('should extract ASIN from Amazon URL', () => {
      const result = buildAffiliateLink(
        'amazon',
        'https://www.amazon.com/dp/B08EXAMPLE?ref=something',
        mockConfig
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.productId).toBe('B08EXAMPLE')
        expect(result.data.finalUrl).toContain('B08EXAMPLE')
      }
    })

    it('should handle case-insensitive platform names', () => {
      const result1 = buildAffiliateLink('AMAZON', 'B08EXAMPLE', mockConfig)
      const result2 = buildAffiliateLink('amazon', 'B08EXAMPLE', mockConfig)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      if (result1.success && result2.success) {
        expect(result1.data.finalUrl).toBe(result2.data.finalUrl)
      }
    })

    it('should build Shein affiliate link with numeric ID', () => {
      const result = buildAffiliateLink('shein', '12345', mockConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.finalUrl).toContain('12345')
        expect(result.data.finalUrl).toContain('shein-aff-456')
      }
    })

    it('should handle disabled affiliate system', () => {
      const disabledConfig: AffiliateConfig = {
        ...mockConfig,
        enabled: false,
      }
      const result = buildAffiliateLink('amazon', 'B08EXAMPLE', disabledConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.affiliateId).toBe('disabled')
      }
    })

    it('should return error for unconfigured platform', () => {
      const result = buildAffiliateLink('unknown-platform', 'ID123', mockConfig)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('No affiliate configuration')
      }
    })

    it('should fail gracefully for invalid product ID', () => {
      const invalidUrl = 'not-a-valid-url-or-id'
      const result = buildAffiliateLink(
        'amazon',
        invalidUrl,
        mockConfig
      )
      // Amazon might fail to extract ASIN from invalid input
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })

    it('should encode special characters in product ID', () => {
      const result = buildAffiliateLink('amazon', 'B08-SPECIAL&CHARS', mockConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.finalUrl).toContain('SPECIAL')
        // URL should be properly encoded
        expect(result.data.finalUrl).not.toMatch(/[&<>"'/]/g)
      }
    })

    it('should include timestamp in generated link', () => {
      const before = new Date()
      const result = buildAffiliateLink('amazon', 'B08EXAMPLE', mockConfig)
      const after = new Date()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
        expect(result.data.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime())
      }
    })

    it('should handle error gracefully when config is invalid', () => {
      const invalidConfig: any = {
        enabled: true,
        platforms: {
          amazon: null, // Invalid
        },
      }
      // Should not throw, should return error result
      const result = buildAffiliateLink('amazon', 'B08EXAMPLE', invalidConfig)
      expect(result.success).toBe(false)
    })
  })

  describe('buildAffiliateLinks (batch)', () => {
    it('should build links for multiple products', () => {
      const products: ProductForAffiliate[] = [
        { id: 'p1', url: 'https://www.amazon.com/dp/B08EXAMPLE', platform: 'amazon' },
        { id: 'p2', url: 'https://us.shein.com/product/12345.html', platform: 'shein' },
      ]

      const results = buildAffiliateLinks(products, mockConfig)

      expect(results.size).toBe(2)
      expect(results.has('p1')).toBe(true)
      expect(results.has('p2')).toBe(true)
    })

    it('should skip failed conversions', () => {
      const products: ProductForAffiliate[] = [
        { id: 'p1', url: 'https://www.amazon.com/dp/B08EXAMPLE', platform: 'amazon' },
        { id: 'p2', url: 'invalid', platform: 'unknown-platform' },
      ]

      const results = buildAffiliateLinks(products, mockConfig)

      // Only p1 should succeed
      expect(results.size).toBe(1)
      expect(results.has('p1')).toBe(true)
      expect(results.has('p2')).toBe(false)
    })
  })

  describe('addAffiliateUrlToProduct', () => {
    it('should add affiliate URL to product without mutation', () => {
      const product: ProductForAffiliate = {
        id: 'p1',
        url: 'https://www.amazon.com/dp/B08EXAMPLE',
        platform: 'amazon',
        title: 'Test Product',
        price: 99.99,
      }

      const enriched = addAffiliateUrlToProduct(product, mockConfig)

      // Original should be unchanged
      expect(product.url).not.toContain('tag=')
      // Enriched should have affiliate URL
      expect(enriched.affiliateUrl).toContain('tag=test-id-123')
      expect(enriched.title).toBe('Test Product')
      expect(enriched.price).toBe(99.99)
    })

    it('should use original URL if affiliate link generation fails', () => {
      const product: ProductForAffiliate = {
        id: 'p1',
        url: 'https://unknown.com/product/123',
        platform: 'unknown-platform',
      }

      const enriched = addAffiliateUrlToProduct(product, mockConfig)

      expect(enriched.affiliateUrl).toBe(product.url)
    })
  })

  describe('Configuration validation', () => {
    it('should validate correct configuration', () => {
      const errors = validateConfig(mockConfig)
      expect(errors.length).toBe(0)
    })

    it('should reject missing baseUrl', () => {
      const invalidConfig: AffiliateConfig = {
        enabled: true,
        platforms: {
          amazon: {
            platform: 'amazon',
            baseUrl: '',
            affiliateId: 'id',
            linkTemplate: '{baseUrl}/dp/{product_id}',
            enabled: true,
          },
        },
      }
      const errors = validateConfig(invalidConfig)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('baseUrl'))).toBe(true)
    })

    it('should reject missing affiliate ID', () => {
      const invalidConfig: AffiliateConfig = {
        enabled: true,
        platforms: {
          amazon: {
            platform: 'amazon',
            baseUrl: 'https://amazon.com',
            affiliateId: '',
            linkTemplate: '{baseUrl}/dp/{product_id}',
            enabled: true,
          },
        },
      }
      const errors = validateConfig(invalidConfig)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('affiliateId'))).toBe(true)
    })

    it('should reject missing required placeholders in template', () => {
      const invalidConfig: AffiliateConfig = {
        enabled: true,
        platforms: {
          amazon: {
            platform: 'amazon',
            baseUrl: 'https://amazon.com',
            affiliateId: 'id',
            linkTemplate: '{baseUrl}/dp', // Missing {product_id}
            enabled: true,
          },
        },
      }
      const errors = validateConfig(invalidConfig)
      expect(errors.some(e => e.includes('product_id'))).toBe(true)
    })
  })

  describe('Configuration loading with defaults', () => {
    const originalEnv = process.env

    beforeEach(() => {
      // Save original environment
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv
    })

    it('should load config without errors (may have empty platforms)', () => {
      // Clear all affiliate env vars
      delete process.env.AFFILIATE_AMAZON_ID
      delete process.env.AFFILIATE_SHEIN_ID
      delete process.env.AFFILIATE_ALIEXPRESS_ID

      const config = loadAffiliateConfig()
      expect(config).toBeDefined()
      expect(config.enabled).toBe(true)
      // May be empty if no affiliate IDs are set
    })

    it('should respect AFFILIATE_ENABLED env var', () => {
      process.env.AFFILIATE_ENABLED = 'false'
      const config = loadAffiliateConfig()
      expect(config.enabled).toBe(false)
    })
  })

  describe('Real-world scenarios', () => {
    it('should generate correct link for a real Amazon product', () => {
      const amazonUrl = 'https://www.amazon.com/dp/B08QSXFH4M'
      const result = buildAffiliateLink('amazon', amazonUrl, mockConfig)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.productId).toBe('B08QSXFH4M')
        expect(result.data.finalUrl).toContain('B08QSXFH4M')
        expect(result.data.finalUrl).toContain('test-id-123')
        expect(result.data.finalUrl).toMatch(/https:\/\/www\.amazon\.com\/dp\//)
      }
    })

    it('should work without forcing config (uses env)', () => {
      const result = buildAffiliateLink('amazon', 'B08EXAMPLE')
      // Should not throw
      expect(result).toBeDefined()
    })

    it('should handle multiple products in a search result', () => {
      const products: ProductForAffiliate[] = [
        {
          id: '1',
          platform: 'amazon',
          url: 'https://www.amazon.com/dp/B001',
          title: 'Product 1',
          price: 29.99,
        },
        {
          id: '2',
          platform: 'amazon',
          url: 'https://www.amazon.com/dp/B002',
          title: 'Product 2',
          price: 39.99,
        },
        {
          id: '3',
          platform: 'shein',
          url: 'https://us.shein.com/product/999.html',
          title: 'Product 3',
          price: 19.99,
        },
      ]

      const affiliateLinks = buildAffiliateLinks(products, mockConfig)

      expect(affiliateLinks.size).toBeGreaterThanOrEqual(2)
      affiliateLinks.forEach((link, productId) => {
        expect(link.finalUrl).toContain(link.platform)
        expect(link.productId).toBeDefined()
      })
    })
  })

  describe('Security & Encoding', () => {
    it('should properly encode affiliate ID to prevent URL injection', () => {
      const maliciousConfig: AffiliateConfig = {
        ...mockConfig,
        platforms: {
          ...mockConfig.platforms,
          amazon: {
            ...mockConfig.platforms.amazon!,
            affiliateId: 'test&tag=malicious',
          },
        },
      }

      const result = buildAffiliateLink('amazon', 'B08EXAMPLE', maliciousConfig)

      if (result.success) {
        // The malicious ID should be encoded
        expect(result.data.finalUrl).not.toContain('&tag=malicious')
        expect(result.data.finalUrl).toContain('test%')
      }
    })

    it('should properly encode product ID', () => {
      const result = buildAffiliateLink('amazon', 'B08-SPECIAL&ID', mockConfig)

      if (result.success) {
        // Special characters should be encoded
        expect(result.data.finalUrl).not.toMatch(/[&<>"']/g)
      }
    })
  })
})
