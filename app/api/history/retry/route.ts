import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, verifyAuth, validateRequiredFields, logApiRequest, type ApiResponse } from '@/lib/api/helpers'

interface RetryRequest {
  historyId: string
}

interface RetryResponse {
  query: string
  redirectUrl: string
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<RetryResponse>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/history/retry', 'POST', userId!)

    // Parse request body
    const body: RetryRequest = await request.json()

    // Validate required fields
    const validationError = validateRequiredFields(body, ['historyId'])
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch the history item
    const { data: historyItem, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('id', body.historyId)
      .eq('user_id', userId) // Ensure user can only access their own history
      .single()

    if (error || !historyItem) {
      return NextResponse.json({ success: false, error: 'History item not found' }, { status: 404 })
    }

    // Return the query for re-search
    const response: RetryResponse = {
      query: historyItem.query,
      redirectUrl: `/search?q=${encodeURIComponent(historyItem.query)}`,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    return handleApiError(error)
  }
}