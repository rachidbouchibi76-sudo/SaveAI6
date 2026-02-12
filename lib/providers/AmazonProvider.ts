import { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'
import { ProductProvider } from './ProductProvider'
import { ProductDataSource } from './data/ProductDataSource'

export class AmazonProvider implements ProductProvider {
  readonly name: string
  readonly type: 'file' | 'api'
  readonly store = 'amazon'

  constructor(private dataSource: ProductDataSource, sourceType: 'file' | 'api' = 'file') {
    this.name = `amazon-${sourceType}`
    this.type = sourceType
  }

  async search(input: SearchInput): Promise<ProviderSearchResult> {
    const startTime = Date.now()
    try {
      const MAX_RESULTS = 20
      const rawProducts = await this.dataSource.fetch(input.query, MAX_RESULTS)
      const normalized = Array.isArray(rawProducts)
        ? rawProducts.map(p => this.normalizeProduct(p))
        : []

      // Basic filtering: reuse provider-level constraints if present
      const filtered = this.filterProducts(normalized, input).slice(0, MAX_RESULTS)
      return {
        provider: this.name,
        products: filtered,
        metadata: {
          totalResults: filtered.length,
          searchTime: Date.now() - startTime,
        }
      }
    } catch (err) {
      console.error('[AmazonProvider] search error:', err)
      return { provider: this.name, products: [], metadata: { totalResults: 0, searchTime: Date.now() - startTime } }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (typeof this.dataSource.isAvailable === 'function') return this.dataSource.isAvailable()
    return true
  }

  protected normalizeProduct(raw: any): Product {
    const price = parseFloat(raw.price || raw.current_price || '0')
    const originalPrice = parseFloat(raw.list_price || raw.original_price || raw.price || '0')
    const savings = originalPrice > price ? originalPrice - price : 0
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0

    // Shipping extraction with multiple fallbacks
    let shippingPrice: number | undefined = undefined
    let shippingTimeDays: number | undefined = undefined

    if (raw.shipping && typeof raw.shipping === 'object') {
      shippingPrice = raw.shipping.cost !== undefined ? parseFloat(String(raw.shipping.cost)) : undefined
      shippingTimeDays = raw.shipping.estimatedDays !== undefined ? parseInt(String(raw.shipping.estimatedDays), 10) : undefined
    } else if (raw.shipping_cost !== undefined) {
      shippingPrice = parseFloat(String(raw.shipping_cost)) || 0
    } else if (raw.shipping_price !== undefined) {
      shippingPrice = parseFloat(String(raw.shipping_price)) || 0
    } else {
      // Default assumption: free shipping on Amazon if not specified
      shippingPrice = 0
    }

    if (shippingTimeDays === undefined) {
      if (raw.delivery_time_days !== undefined) shippingTimeDays = parseInt(String(raw.delivery_time_days), 10)
      else if (raw.estimated_delivery_days !== undefined) shippingTimeDays = parseInt(String(raw.estimated_delivery_days), 10)
      else shippingTimeDays = undefined
    }

    return {
      id: raw.asin || raw.id || `amazon-${Date.now()}-${Math.random()}`,
      platform: this.store,
      title: raw.title || raw.name || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.image_url || raw.image || raw.main_image || '',
      url: raw.product_url || raw.url || '',
      rating: parseFloat(raw.rating || raw.stars || '0') || undefined,
      reviews_count: raw.reviews_count !== undefined ? parseInt(String(raw.reviews_count), 10) : (raw.reviews !== undefined ? parseInt(String(raw.reviews), 10) : undefined),
      shipping_price: shippingPrice,
      shipping_time_days: shippingTimeDays,
      category: raw.category || raw.product_category || '',
      brand: raw.brand || '',
      description: raw.description || raw.product_description || '',
      metadata: raw
    }
  }

  private filterProducts(products: Product[], input: SearchInput): Product[] {
    const query = input.query.toLowerCase()
    const constraints = input.constraints || {}

    return products.filter(product => {
      if (constraints.categories && constraints.categories.length > 0) {
        if (!product.category) return false
        const normalizedCategory = product.category.toLowerCase()
        const match = constraints.categories.some(cat => normalizedCategory.includes(cat.toLowerCase()))
        if (!match) return false
      }

      if (constraints.minPrice !== undefined && product.price < constraints.minPrice) return false
      if (constraints.maxPrice !== undefined && product.price > constraints.maxPrice) return false

      if (!product.title) return false

      if (query && product.title.toLowerCase().indexOf(query) === -1) return false

      return true
    })
  }
}
