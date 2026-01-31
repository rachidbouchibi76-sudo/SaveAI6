import { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'
import { ProductProvider } from './ProductProvider'
import { ProductDataSource } from './data/ProductDataSource'

export class SheinProvider implements ProductProvider {
  readonly name: string
  readonly type: 'file' | 'api'
  readonly store = 'shein'

  constructor(private dataSource: ProductDataSource, sourceType: 'file' | 'api' = 'file') {
    this.name = `shein-${sourceType}`
    this.type = sourceType
  }

  async search(input: SearchInput): Promise<ProviderSearchResult> {
    const startTime = Date.now()
    try {
      const rawProducts = await this.dataSource.fetch(input.query)
      const normalized = Array.isArray(rawProducts)
        ? rawProducts.map(p => this.normalizeProduct(p))
        : []

      const filtered = this.filterProducts(normalized, input)
      return {
        provider: this.name,
        products: filtered,
        metadata: {
          totalResults: filtered.length,
          searchTime: Date.now() - startTime,
        }
      }
    } catch (err) {
      console.error('[SheinProvider] search error:', err)
      return { provider: this.name, products: [], metadata: { totalResults: 0, searchTime: Date.now() - startTime } }
    }
  }

  async isAvailable(): Promise<boolean> {
    if (typeof this.dataSource.isAvailable === 'function') return this.dataSource.isAvailable()
    return true
  }

  protected normalizeProduct(raw: any): Product {
    const price = parseFloat(raw.sale_price || raw.price || raw.retailPrice || '0')
    const originalPrice = parseFloat(raw.retail_price || raw.original_price || raw.unit_price || raw.price || '0')
    const savings = originalPrice > price ? originalPrice - price : 0
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0

    return {
      id: raw.goods_id || raw.id || raw.productId || `shein-${Date.now()}-${Math.random()}`,
      name: raw.goods_name || raw.name || raw.title || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.goods_img || raw.image || raw.goods_thumb || raw.detail_image || '',
      url: raw.goods_url || raw.url || raw.productRelationID || '',
      store: this.store,
      rating: parseFloat(raw.comment_rank || raw.rating || raw.productDetails?.ratings || '0'),
      reviews: parseInt(raw.comment_count || raw.reviews || raw.commentNumber || '0', 10),
      category: raw.cat_name || raw.category || raw.cate_name || '',
      brand: 'SHEIN',
      description: raw.detail || raw.description || raw.goods_desc || '',
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
