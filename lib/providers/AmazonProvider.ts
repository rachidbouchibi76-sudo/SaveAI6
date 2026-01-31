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

    return {
      id: raw.asin || raw.id || `amazon-${Date.now()}-${Math.random()}`,
      name: raw.title || raw.name || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.image_url || raw.image || raw.main_image || '',
      url: raw.product_url || raw.url || '',
      store: this.store,
      rating: parseFloat(raw.rating || raw.stars || '0'),
      reviews: parseInt(raw.reviews_count || raw.reviews || raw.num_reviews || '0', 10),
      category: raw.category || raw.product_category || '',
      brand: raw.brand || '',
      description: raw.description || raw.product_description || '',
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

      if (!product.name) return false

      if (query && product.name.toLowerCase().indexOf(query) === -1) return false

      return true
    })
  }
}
