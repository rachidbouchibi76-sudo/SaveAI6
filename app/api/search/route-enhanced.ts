import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  handleApiError,
  verifyAuth,
  logApiRequest,
  type ApiResponse,
} from '@/lib/api/helpers-enhanced'
import { getProviderResolver } from '@/lib/resolver/ProviderResolver'
import { validateAndSanitize, searchSchema } from '@/lib/api/validation'

interface Product {
  id: string
  title: string
  price: number
  currency: string
  image?: string
  url: string
  platform: string
  rating?: number
  reviews_count?: number
}

interface SearchResponse {
  query: string
  type: 'url' | 'keyword'
  urlType?: 'amazon' | 'other'
  product: Product
  alternatives: Product[]
  cheapest: Product
  searchId: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SearchResponse>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/search', 'POST', userId!)

    // Parse and validate request body
    const body = await request.json()
    const validation = validateAndSanitize(searchSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { query } = validation.data

    // Detect if input is URL or keyword
    const isUrlInput = /^https?:\/\/.+/.test(query)
    const urlType = isUrlInput ? (query.includes('amazon') ? 'amazon' : 'other') : undefined

    // Mock product data (replace with actual scraping/API logic)
    const mockProduct: Product = {
      id: 'prod_' + Date.now(),
      title: isUrlInput ? 'Product from URL' : `Search results for: ${query}`,
      price: 299.99,
      currency: 'USD',
      image: '/placeholder.jpg',
      url: isUrlInput ? query : `https://example.com/product/${Date.now()}`,
      platform: urlType === 'amazon' ? 'Amazon' : 'Generic Store',
      rating: 4.5,
      reviews_count: 1234,
    }

    // Mock alternatives (legacy) - try providers if available
    let allProducts: Product[] = [mockProduct]

    try {
      const resolver = getProviderResolver()
      const providers = await resolver.getAvailableProviders()

      for (const provider of providers) {
        const res = await provider.search({ query, type: isUrlInput ? 'url' : 'keyword', userId: userId || undefined })
        if (res && Array.isArray(res.products) && res.products.length > 0) {
          allProducts = [...allProducts, ...res.products]
        }
        if (allProducts.length >= 3) break
      }
    } catch (err) {
      console.warn('[ProviderResolver] providers unavailable, falling back to mocks')
      const mockAlternatives: Product[] = [
        {
          id: 'alt_1',
          title: mockProduct.title + ' - Alternative 1',
          price: 279.99,
          currency: 'USD',
          image: '/placeholder.jpg',
          url: 'https://example.com/alt1',
          platform: 'Store A',
          rating: 4.3,
          reviews_count: 890,
        },
      ]
      allProducts = [...allProducts, ...mockAlternatives]
    }

    const cheapest = allProducts.reduce((min, p) => (p.price < min.price ? p : min))

    // Store search in database with proper error handling
    const supabase = await createClient()
    const { data: searchRecord, error: dbError } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query: query,
        type: isUrlInput ? 'url' : 'keyword',
        url_type: urlType,
        result_count: allProducts.length,
        cheapest_price: cheapest.price,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[DB Error]:', { timestamp: new Date().toISOString() })
      // Continue even if DB insert fails
    }

    const alternatives = allProducts.slice(1, 6)
    const response: SearchResponse = {
      query: query,
      type: isUrlInput ? 'url' : 'keyword',
      urlType,
      product: mockProduct,
      alternatives,
      cheapest,
      searchId: searchRecord?.id || 'search_' + Date.now(),
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    return handleApiError(error)
  }
}