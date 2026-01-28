import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, verifyAuth, validateRequiredFields, logApiRequest, type ApiResponse } from '@/lib/api/helpers'

interface SavedProduct {
  id: string
  user_id: string
  product_name: string
  product_url: string
  product_price: number
  product_currency: string
  product_image?: string
  store: string
  notes?: string
  created_at: string
  updated_at: string
}

interface SaveProductRequest {
  productName: string
  productUrl: string
  productPrice: number
  productCurrency: string
  productImage?: string
  store: string
  notes?: string
}

interface UpdateProductRequest {
  id: string
  notes?: string
}

// GET - Fetch user's saved products
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SavedProduct[]>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/saved', 'GET', userId!)

    const supabase = await createClient()

    // Fetch saved products for authenticated user
    const { data, error } = await supabase
      .from('saved_products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DB Error]:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch saved products' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST - Save a new product
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SavedProduct>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/saved', 'POST', userId!)

    // Parse request body
    const body: SaveProductRequest = await request.json()

    // Validate required fields
    const validationError = validateRequiredFields(body, [
      'productName',
      'productUrl',
      'productPrice',
      'productCurrency',
      'store',
    ])
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if product already saved
    const { data: existing } = await supabase
      .from('saved_products')
      .select('id')
      .eq('user_id', userId)
      .eq('product_url', body.productUrl)
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Product already saved' }, { status: 409 })
    }

    // Insert new saved product
    const { data, error } = await supabase
      .from('saved_products')
      .insert({
        user_id: userId,
        product_name: body.productName,
        product_url: body.productUrl,
        product_price: body.productPrice,
        product_currency: body.productCurrency,
        product_image: body.productImage,
        store: body.store,
        notes: body.notes,
      })
      .select()
      .single()

    if (error) {
      console.error('[DB Error]:', error)
      return NextResponse.json({ success: false, error: 'Failed to save product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Remove a saved product
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/saved', 'DELETE', userId!)

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete saved product (ensure user owns it)
    const { error } = await supabase.from('saved_products').delete().eq('id', productId).eq('user_id', userId)

    if (error) {
      console.error('[DB Error]:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete saved product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH - Update saved product (e.g., notes)
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<SavedProduct>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/saved', 'PATCH', userId!)

    // Parse request body
    const body: UpdateProductRequest = await request.json()

    // Validate required fields
    const validationError = validateRequiredFields(body, ['id'])
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    const supabase = await createClient()

    // Update saved product (ensure user owns it)
    const { data, error } = await supabase
      .from('saved_products')
      .update({
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[DB Error]:', error)
      return NextResponse.json({ success: false, error: 'Failed to update saved product' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}