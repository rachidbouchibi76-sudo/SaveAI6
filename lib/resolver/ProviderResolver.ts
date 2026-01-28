/**
 * Provider Resolver
 * Selects and manages available product providers based on configuration
 * 
 * Design Principles:
 * - Configuration-driven provider selection
 * - Environment variable based enable/disable
 * - NO hardcoded store logic in business layer
 * - Extensible for new providers
 */

import { ProductProvider } from '@/lib/providers/ProductProvider'
import { AmazonFileProvider } from '@/lib/providers/AmazonFileProvider'
import { SheinFileProvider } from '@/lib/providers/SheinFileProvider'

export interface ProviderConfig {
  enabled: boolean
  priority?: number
  options?: Record<string, any>
}

export interface ResolverConfig {
  providers: {
    [key: string]: ProviderConfig
  }
}

export class ProviderResolver {
  private providers: Map<string, ProductProvider> = new Map()
  private config: ResolverConfig
  
  constructor(config?: ResolverConfig) {
    this.config = config || this.getDefaultConfig()
    this.initializeProviders()
  }
  
  /**
   * Get default configuration from environment variables
   */
  private getDefaultConfig(): ResolverConfig {
    return {
      providers: {
        'amazon-file': {
          enabled: process.env.ENABLE_AMAZON_FILE === 'true',
          priority: 1,
          options: {
            dataFilePath: process.env.AMAZON_DATA_FILE || '/data/amazon-products.json'
          }
        },
        'shein-file': {
          enabled: process.env.ENABLE_SHEIN_FILE === 'true',
          priority: 2,
          options: {
            dataFilePath: process.env.SHEIN_DATA_FILE || '/data/shein-products.json'
          }
        },
        // Future providers can be added here
        // 'amazon-api': { enabled: false, priority: 3 },
        // 'shein-api': { enabled: false, priority: 4 },
      }
    }
  }
  
  /**
   * Initialize provider instances based on configuration
   */
  private initializeProviders(): void {
    const configs = this.config.providers
    
    // Amazon File Provider
    if (configs['amazon-file']?.enabled) {
      const options = configs['amazon-file'].options || {}
      this.providers.set('amazon-file', new AmazonFileProvider(options.dataFilePath))
    }
    
    // Shein File Provider
    if (configs['shein-file']?.enabled) {
      const options = configs['shein-file'].options || {}
      this.providers.set('shein-file', new SheinFileProvider(options.dataFilePath))
    }
    
    // Future providers will be initialized here
  }
  
  /**
   * Get all enabled and available providers
   */
  async getAvailableProviders(): Promise<ProductProvider[]> {
    const available: ProductProvider[] = []
    
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        available.push(provider)
      }
    }
    
    // Sort by priority if configured
    return this.sortByPriority(available)
  }
  
  /**
   * Get a specific provider by name
   */
  getProvider(name: string): ProductProvider | undefined {
    return this.providers.get(name)
  }
  
  /**
   * Get providers for a specific store
   */
  async getProvidersByStore(store: string): Promise<ProductProvider[]> {
    const available = await this.getAvailableProviders()
    return available.filter(p => p.store === store)
  }
  
  /**
   * Check if any providers are available
   */
  async hasAvailableProviders(): Promise<boolean> {
    const available = await this.getAvailableProviders()
    return available.length > 0
  }
  
  /**
   * Sort providers by configured priority
   */
  private sortByPriority(providers: ProductProvider[]): ProductProvider[] {
    return providers.sort((a, b) => {
      const priorityA = this.config.providers[a.name]?.priority || 999
      const priorityB = this.config.providers[b.name]?.priority || 999
      return priorityA - priorityB
    })
  }
  
  /**
   * Reload configuration and reinitialize providers
   */
  reload(config: ResolverConfig): void {
    this.providers.clear()
    this.config = config
    this.initializeProviders()
  }
}

/**
 * Singleton instance for application-wide use
 * Can be overridden with custom configuration if needed
 */
let resolverInstance: ProviderResolver | null = null

export function getProviderResolver(config?: ResolverConfig): ProviderResolver {
  if (!resolverInstance) {
    resolverInstance = new ProviderResolver(config)
  }
  return resolverInstance
}

export function resetProviderResolver(): void {
  resolverInstance = null
}