import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { POST } from '@/app/api/search/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'search-id-123' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

describe('POST /api/search', () => {
  it('should return 401 when not authenticated', async () => {
    // Mock unauthenticated user
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockImplementationOnce(() => ({
      auth: {
        getUser: jest.fn(() => ({
          data: { user: null },
          error: new Error('Not authenticated'),
        })),
      },
    }))

    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test product' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 400 for invalid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: '' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should successfully search with valid input', async () => {
    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'wireless headphones' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('product')
    expect(data.data).toHaveProperty('alternatives')
    expect(data.data).toHaveProperty('cheapest')
  })

  it('should detect URL input correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'https://amazon.com/product/123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.data.type).toBe('url')
    expect(data.data.urlType).toBe('amazon')
  })
})