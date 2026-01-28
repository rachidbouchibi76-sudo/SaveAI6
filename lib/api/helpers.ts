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
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('[API Error]:', error)

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Unknown error occurred',
    },
    { status: 500 }
  )
}

/**
 * Verify user authentication and return user ID
 */
export async function verifyAuth(): Promise<{ userId: string | null; error?: NextResponse }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return {
        userId: null,
        error: NextResponse.json({ error: 'Unauthorized', details: 'Please sign in to continue' }, { status: 401 }),
      }
    }

    return { userId: user.id }
  } catch (error) {
    console.error('[Auth Error]:', error)
    return {
      userId: null,
      error: NextResponse.json({ error: 'Authentication failed' }, { status: 401 }),
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