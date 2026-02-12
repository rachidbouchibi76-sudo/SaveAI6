import { BaseProductProvider } from './ProductProvider'
import { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export class AmazonFileProvider extends BaseProductProvider {
  readonly name = 'amazon-file'
  readonly type = 'file' as const
  readonly store = 'amazon'
  
  private dataFilePath: string
  private readonly MAX_RESULTS = 20
  
  constructor(dataFilePath: string = join(process.cwd(), 'data', 'amazon-products.json')) {
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
    const price = parseFloat(raw.price || raw.current_price || '0')
    const originalPrice = parseFloat(raw.list_price || raw.original_price || raw.price || '0')
    const savings = originalPrice > price ? originalPrice - price : 0
    const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0
    
    return {
      id: raw.asin || raw.id || `amazon-${Date.now()}-${Math.random()}`,
      title: raw.title || raw.name || '',
      price,
      currency: raw.currency || 'USD',
      originalPrice,
      savings,
      savingsPercent,
      image: raw.image_url || raw.image || raw.main_image || '',
      url: raw.product_url || raw.url || '',
      platform: this.store,
      rating: parseFloat(raw.rating || raw.stars || '0'),
      reviews_count: parseInt(raw.reviews_count || raw.reviews || raw.num_reviews || '0', 10),
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
      const brandMatch = (product.brand || '').toLowerCase().includes(query)
      
      return nameMatch || categoryMatch || brandMatch
    })
  }
}