/**
 * Affiliate configuration loader
 * Loads all settings from environment variables
 * Never commits secrets to repository
 */

import { AffiliateConfig, AffiliatePlatform } from './types'

/**
 * Create a platform configuration from environment variables
 */
function createPlatformFromEnv(
  platform: string,
  baseUrlEnv: string,
  idEnv: string,
  templateEnv: string,
  baseUrlDefault: string,
  templateDefault: string
): AffiliatePlatform | null {
  const baseUrl = process.env[baseUrlEnv] || baseUrlDefault
  const affiliateId = process.env[idEnv]

  // Affiliate ID is required - if missing, platform is disabled
  if (!affiliateId || affiliateId.trim().length === 0) {
    return null
  }

  const linkTemplate = process.env[templateEnv] || templateDefault

  return {
    platform: platform.toLowerCase(),
    baseUrl,
    affiliateId,
    linkTemplate,
    enabled: true,
  }
}

/**
 * Load affiliate configuration from environment variables
 * Gracefully handles missing configurations
 */
export function loadAffiliateConfig(): AffiliateConfig {
  const enabled = (process.env.AFFILIATE_ENABLED || 'true').toLowerCase() === 'true'

  const platforms: Record<string, AffiliatePlatform> = {}

  // Amazon
  const amazon = createPlatformFromEnv(
    'amazon',
    'AFFILIATE_AMAZON_BASE_URL',
    'AFFILIATE_AMAZON_ID',
    'AFFILIATE_AMAZON_TEMPLATE',
    'https://www.amazon.com',
    '{baseUrl}/dp/{product_id}?tag={affiliate_id}'
  )
  if (amazon) platforms.amazon = amazon

  // Shein
  const shein = createPlatformFromEnv(
    'shein',
    'AFFILIATE_SHEIN_BASE_URL',
    'AFFILIATE_SHEIN_ID',
    'AFFILIATE_SHEIN_TEMPLATE',
    'https://us.shein.com',
    '{baseUrl}/product/{product_id}.html?aff={affiliate_id}'
  )
  if (shein) platforms.shein = shein

  // AliExpress
  const aliexpress = createPlatformFromEnv(
    'aliexpress',
    'AFFILIATE_ALIEXPRESS_BASE_URL',
    'AFFILIATE_ALIEXPRESS_ID',
    'AFFILIATE_ALIEXPRESS_TEMPLATE',
    'https://www.aliexpress.com',
    '{baseUrl}/item/{product_id}.html?aff={affiliate_id}'
  )
  if (aliexpress) platforms.aliexpress = aliexpress

  return { enabled, platforms }
}

/**
 * Validate affiliate configuration
 * Returns array of validation errors (empty = valid)
 */
export function validateConfig(cfg: AffiliateConfig): string[] {
  const errors: string[] = []

  if (!cfg.platforms || Object.keys(cfg.platforms).length === 0) {
    if (cfg.enabled) {
      errors.push('Affiliate system enabled but no platforms configured')
    }
    return errors
  }

  Object.entries(cfg.platforms).forEach(([key, platform]) => {
    if (!platform.baseUrl || platform.baseUrl.trim().length === 0) {
      errors.push(`${key}: missing baseUrl`)
    }
    if (!platform.affiliateId || platform.affiliateId.trim().length === 0) {
      errors.push(`${key}: missing affiliateId`)
    }
    if (!platform.linkTemplate || platform.linkTemplate.trim().length === 0) {
      errors.push(`${key}: missing linkTemplate`)
    }
    if (!platform.linkTemplate.includes('{product_id}')) {
      errors.push(`${key}: linkTemplate must contain {product_id} placeholder`)
    }
    if (!platform.linkTemplate.includes('{affiliate_id}')) {
      errors.push(`${key}: linkTemplate must contain {affiliate_id} placeholder`)
    }
  })

  return errors
}

/**
 * Get configuration with validation
 * Throws if configuration is invalid
 */
export function getAffiliateConfigOrThrow(): AffiliateConfig {
  const config = loadAffiliateConfig()
  const errors = validateConfig(config)

  if (errors.length > 0) {
    throw new Error(`Invalid affiliate configuration: ${errors.join('; ')}`)
  }

  return config
}
