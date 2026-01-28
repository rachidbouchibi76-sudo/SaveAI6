import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeHtml } from './validation'

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
 * Enhanced error handler with proper logging (no sensitive data)
 */
export function handleApiError(error: unknown): NextResponse<ApiError> {
  // Log error without sensitive information
  if (error instanceof Error) {
    console.error('[API Error]:', {
      message: error.message,
      name: error.name,
      timestamp: new Date().toISOString(),
    })
  } else {
    console.error('[API Error]: Unknown error', {
      timestamp: new Date().toISOString(),
    })
  }

  // Return generic error to client (don't expose internal details)
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      details: 'An error occurred while processing your request',
    },
    { status: 500 }
  )
}

/**
 * Enhanced authentication verification with proper error handling
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
        error: NextResponse.json(
          { error: 'Unauthorized', details: 'Authentication required' },
          { status: 401 }
        ),
      }
    }

    return { userId: user.id }
  } catch (error) {
    console.error('[Auth Error]:', {
      timestamp: new Date().toISOString(),
    })
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      ),
    }
  }
}

/**
 * Enhanced field validation
 */
export function validateRequiredFields(body: any, requiredFields: string[]): string | null {
  if (!body || typeof body !== 'object') {
    return 'Invalid request body'
  }

  for (const field of requiredFields) {
    const value = body[field]
    if (value === undefined || value === null || value === '') {
      return `Missing required field: ${field}`
    }
  }
  return null
}

/**
 * Enhanced input sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  return sanitizeHtml(input).substring(0, 1000)
}

/**
 * URL validation and detection
 */
export function isUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

/**
 * Detect URL type with enhanced security
 */
export function detectUrlType(url: string): 'amazon' | 'other' {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    
    if (hostname.includes('amazon.com') || 
        hostname.includes('amazon.') || 
        hostname.includes('amzn.to')) {
      return 'amazon'
    }
    return 'other'
  } catch {
    return 'other'
  }
}

/**
 * Structured logging without sensitive data
 */
export function logApiRequest(endpoint: string, method: string, userId?: string) {
  console.log(JSON.stringify({
    type: 'api_request',
    endpoint,
    method,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  }))
}

/**
 * CSRF token validation (for sensitive operations)
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const token = request.headers.get('x-csrf-token')
  const cookie = request.cookies.get('csrf-token')?.value
  
  if (!token || !cookie || token !== cookie) {
    return false
  }
  
  return true
}