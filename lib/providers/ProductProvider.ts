/**
 * ProductProvider Interface
 * Abstract contract for all product data sources (file-based or API-based)
 * 
 * Design Principles:
 * - Provider returns raw candidate products only
 * - NO business logic (scoring, ranking, filtering)
 * - NO dependencies on other providers
 * - Fully interchangeable implementations
 */

import { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'

export interface ProductProvider {
  /**
   * Provider identifier (e.g., "amazon-file", "shein-api")
   */
  readonly name: string
  
  /**
   * Provider type for configuration
   */
  readonly type: 'file' | 'api'
  
  /**
   * Store identifier (e.g., "amazon", "shein")
   */
  readonly store: string
  
  /**
   * Search for products based on input query
   * Returns raw candidate products without any scoring or ranking
   * 
   * @param input - Search input with query and constraints
   * @returns Promise resolving to provider search result
   */
  search(input: SearchInput): Promise<ProviderSearchResult>
  
  /**
   * Check if provider is available and properly configured
   * @returns Promise resolving to availability status
   */
  isAvailable(): Promise<boolean>
}

/**
 * Base abstract class for common provider functionality
 * Providers can extend this or implement ProductProvider directly
 */
export abstract class BaseProductProvider implements ProductProvider {
  abstract readonly name: string
  abstract readonly type: 'file' | 'api'
  abstract readonly store: string
  
  abstract search(input: SearchInput): Promise<ProviderSearchResult>
  
  async isAvailable(): Promise<boolean> {
    return true
  }
  
  /**
   * Helper: Normalize product data to unified schema
   * Subclasses should implement this for their specific data format
   */
  protected abstract normalizeProduct(raw: any): Product
}