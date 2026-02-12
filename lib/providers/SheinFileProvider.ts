import { BaseProductProvider } from './ProductProvider'
import { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export class SheinFileProvider extends BaseProductProvider {
  readonly name = 'shein-file'
  readonly type = 'file' as const
  readonly store = 'shein'
  
  private dataFilePath: string
  private readonly MAX_RESULTS = 20
  
  constructor(dataFilePath: string = join(process.cwd(), 'data', 'shein-products.json')) {
    super()
    this.dataFilePath = dataFilePath
  }
  
  async search(input: SearchInput): Promise<ProviderSearchResult> {
    const startTime = Date.now()
    
    try {
      if (!existsSync(this.dataFilePath)) {
        return {
          provider: this.name,
          products: [],
          metadata: {
            totalResults: 0,
            searchTime: Date.now() - startTime,
          }
        }
      }
      
      const fileContent = await readFile(this.dataFilePath, 'utf-8')
      const rawProducts = JSON.parse(fileContent)
      
      const normalizedProducts = Array.isArray(rawProducts) 
        ? rawProducts.map(p => this.normalizeProduct(p))
        : []
      
      const filtered = this.filterProducts(normalizedProducts, input)
      const results = filtered.slice(0, this.MAX_RESULTS)
      
      return {
        provider: this.name,
        products: results,
        metadata: {
          totalResults: filtered.length,
          searchTime: Date.now() - startTime,
        }
      }
    } catch (error) {
      console.error(`[${this.name}] Search error:`, error)
      return {
        provider: this.name,
        products: [],
        metadata: {
          totalResults: 0,
          searchTime: Date.now() - startTime,
        }
      }
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return existsSync(this.dataFilePath)
  }
  
  protected normalizeProduct(raw: any): Product {
    const price = parseFloat(raw.sale_price || raw.price || raw.retailPrice || '0')
    const originalPrice = parseFloat(raw.retail_price || raw.original_price || raw.unit_price || raw.price || '0')
    const savings = originalPrice > price ? originalPrice - price : 0
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0
    
    return {
      id: raw.goods_id || raw.id || raw.productId || `shein-${Date.now()}-${Math.random()}`,
      title: raw.goods_name || raw.name || raw.title || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.goods_img || raw.image || raw.goods_thumb || raw.detail_image || '',
      url: raw.goods_url || raw.url || raw.productRelationID || '',
      platform: this.store,
      rating: parseFloat(raw.comment_rank || raw.rating || raw.productDetails?.ratings || '0'),
      reviews_count: parseInt(raw.comment_count || raw.reviews || raw.commentNumber || '0', 10),
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
        const productCategory = (product.category || '').toLowerCase()
        const matchesCategory = constraints.categories.some(cat => 
          productCategory.includes(cat.toLowerCase())
        )
        if (!matchesCategory) return false
      }
      
      if (constraints.minPrice !== undefined && product.price < constraints.minPrice) {
        return false
      }
      
      if (constraints.maxPrice !== undefined && product.price > constraints.maxPrice) {
        return false
      }
      
      if (constraints.minRating !== undefined && (product.rating || 0) < constraints.minRating) {
        return false
      }
      
      const nameMatch = product.title.toLowerCase().includes(query)
      const categoryMatch = (product.category || '').toLowerCase().includes(query)
      const descMatch = (product.description || '').toLowerCase().includes(query)
      
      return nameMatch || categoryMatch || descMatch
    })
  }
}