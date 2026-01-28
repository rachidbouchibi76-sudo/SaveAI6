import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, verifyAuth, logApiRequest, type ApiResponse } from '@/lib/api/helpers'

interface SearchHistoryItem {
  id: string
  query: string
  type: 'url' | 'keyword'
  url_type?: 'amazon' | 'other'
  result_count: number
  cheapest_price: number
  created_at: string
}

// GET - Fetch user's search history
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SearchHistoryItem[]>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/history', 'GET', userId!)

    const supabase = await createClient()

    // Fetch search history for authenticated user
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[DB Error]:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE - Clear entire history or single item
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: number }>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/history', 'DELETE', userId!)

    const { searchParams } = new URL(request.url)
    const historyId = searchParams.get('id')

    const supabase = await createClient()

    if (historyId) {
      // Delete single item
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', historyId)
        .eq('user_id', userId) // Ensure user can only delete their own history

      if (error) {
        console.error('[DB Error]:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete history item' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { deleted: 1 },
      })
    } else {
      // Clear entire history
      const { error, count } = await supabase.from('search_history').delete().eq('user_id', userId)

      if (error) {
        console.error('[DB Error]:', error)
        return NextResponse.json({ success: false, error: 'Failed to clear history' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: { deleted: count || 0 },
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}