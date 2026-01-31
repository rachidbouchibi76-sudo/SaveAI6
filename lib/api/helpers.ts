import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ApiError {
  error: string
  details?: string
  code?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: string
}

/**
 * Centralized error handler for API routes
 * Returns the standard ApiResponse shape so callers typed as
 * NextResponse<ApiResponse<T>> remain compatible when an error occurs
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error('[API Error]:', error)

  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        details: error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Unknown error occurred',
    },
    { status: 500 }
  )
}

/**
 * Verify user authentication and return user ID and user object
 * Accepts optional Supabase client (some routes pass it explicitly)
 */
export async function verifyAuth(supabaseClient?: any): Promise<{ userId: string | null; user?: any; error?: NextResponse<ApiResponse<never>> }> {
  try {
    const supabase = supabaseClient ?? (await createClient())
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        userId: null,
        error: NextResponse.json({ success: false, error: 'Unauthorized', details: 'Please sign in to continue' }, { status: 401 }),
      }
    }

    return { userId: user.id, user }
  } catch (error) {
    console.error('[Auth Error]:', error)
    return {
      userId: null,
      error: NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 }),
    }
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!body[field]) {
      return `Missing required field: ${field}`
    }
  }
  return null
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 1000) // Limit length
}

/**
 * Detect if input is a URL
 */
export function isUrl(input: string): boolean {
  try {
    new URL(input)
    return true
  } catch {
    return false
  }
}

/**
 * Detect URL type (Amazon, etc.)
 */
export function detectUrlType(url: string): 'amazon' | 'other' {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amzn.to')) {
    return 'amazon'
  }
  return 'other'
}

/**
 * Log API request for debugging
 */
export function logApiRequest(endpoint: string, method: string, userId?: string) {
  console.log(`[API] ${method} ${endpoint} - User: ${userId || 'anonymous'} - ${new Date().toISOString()}`)
}