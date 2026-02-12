/**
 * Affiliate Module - Complete Public API
 * Decoupled from scoring, ranking, and recommendation logic
 */

export type { AffiliatePlatform, AffiliateConfig, AffiliateLink, AffiliateLinkResult, ProductForAffiliate, PlatformName } from './types'

export { loadAffiliateConfig, validateConfig, getAffiliateConfigOrThrow } from './config'

export { buildAffiliateLink, buildAffiliateLinks, addAffiliateUrlToProduct } from './builder'
