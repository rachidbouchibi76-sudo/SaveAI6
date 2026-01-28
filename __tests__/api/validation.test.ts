import { describe, it, expect } from '@jest/globals'
import {
  searchSchema,
  saveProductSchema,
  sanitizeHtml,
  sanitizeUrl,
  validateAndSanitize,
} from '@/lib/api/validation'

describe('Input Validation', () => {
  describe('searchSchema', () => {
    it('should accept valid search query', () => {
      const result = validateAndSanitize(searchSchema, { query: 'test product' })
      expect(result.success).toBe(true)
    })

    it('should reject empty query', () => {
      const result = validateAndSanitize(searchSchema, { query: '' })
      expect(result.success).toBe(false)
    })

    it('should reject query exceeding max length', () => {
      const result = validateAndSanitize(searchSchema, { query: 'a'.repeat(1001) })
      expect(result.success).toBe(false)
    })
  })

  describe('saveProductSchema', () => {
    it('should accept valid product data', () => {
      const result = validateAndSanitize(saveProductSchema, {
        productName: 'Test Product',
        productUrl: 'https://example.com/product',
        productPrice: 99.99,
        productCurrency: 'USD',
        store: 'Test Store',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid URL', () => {
      const result = validateAndSanitize(saveProductSchema, {
        productName: 'Test Product',
        productUrl: 'not-a-url',
        productPrice: 99.99,
        productCurrency: 'USD',
        store: 'Test Store',
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative price', () => {
      const result = validateAndSanitize(saveProductSchema, {
        productName: 'Test Product',
        productUrl: 'https://example.com/product',
        productPrice: -10,
        productCurrency: 'USD',
        store: 'Test Store',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>Hello')
      expect(result).toBe('scriptalert("xss")/scriptHello')
    })

    it('should remove javascript: protocol', () => {
      const result = sanitizeHtml('javascript:alert("xss")')
      expect(result).toBe('alert("xss")')
    })

    it('should remove event handlers', () => {
      const result = sanitizeHtml('onclick=alert("xss")')
      expect(result).toBe('alert("xss")')
    })
  })

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URL', () => {
      expect(() => sanitizeUrl('https://example.com')).not.toThrow()
    })

    it('should accept valid HTTP URL', () => {
      expect(() => sanitizeUrl('http://example.com')).not.toThrow()
    })

    it('should reject javascript: protocol', () => {
      expect(() => sanitizeUrl('javascript:alert("xss")')).toThrow()
    })

    it('should reject data: protocol', () => {
      expect(() => sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toThrow()
    })

    it('should reject invalid URL', () => {
      expect(() => sanitizeUrl('not-a-url')).toThrow()
    })
  })
})