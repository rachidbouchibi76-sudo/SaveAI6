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
    // Shipping extraction
    let shippingPrice: number | undefined = undefined
    let shippingTimeDays: number | undefined = undefined

    if (raw.shipping && typeof raw.shipping === 'object') {
      shippingPrice = raw.shipping.fee !== undefined ? parseFloat(String(raw.shipping.fee)) : undefined
      shippingTimeDays = raw.shipping.delivery_days !== undefined ? parseInt(String(raw.shipping.delivery_days), 10) : undefined
    } else if (raw.shipping_fee !== undefined) {
      shippingPrice = parseFloat(String(raw.shipping_fee)) || 0
    } else if (raw.freight !== undefined) {
      shippingPrice = parseFloat(String(raw.freight)) || 0
    } else {
      // If not provided, default to 0 (many Shein listings show free shipping/promotions)
      shippingPrice = 0
    }

    if (shippingTimeDays === undefined) {
      if (raw.delivery_days !== undefined) shippingTimeDays = parseInt(String(raw.delivery_days), 10)
      else shippingTimeDays = undefined
    }

    return {
      id: raw.goods_id || raw.id || raw.productId || `shein-${Date.now()}-${Math.random()}`,
      platform: this.store,
      title: raw.goods_name || raw.name || raw.title || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.goods_img || raw.image || raw.goods_thumb || raw.detail_image || '',
      url: raw.goods_url || raw.url || raw.productRelationID || '',
      rating: parseFloat(raw.comment_rank || raw.rating || raw.productDetails?.ratings || '0') || undefined,
      reviews_count: raw.comment_count !== undefined ? parseInt(String(raw.comment_count), 10) : (raw.reviews !== undefined ? parseInt(String(raw.reviews), 10) : undefined),
      shipping_price: shippingPrice,
      shipping_time_days: shippingTimeDays,
      category: raw.cat_name || raw.category || raw.cate_name || '',
      brand: raw.brand || 'SHEIN',
      description: raw.detail || raw.description || raw.goods_desc || '',
      metadata: raw,
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
