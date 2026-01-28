import { z } from 'zod'

// Input validation schemas
export const searchSchema = z.object({
  query: z.string().min(1).max(1000).trim(),
})

export const saveProductSchema = z.object({
  productName: z.string().min(1).max(500).trim(),
  productUrl: z.string().url().max(2000),
  productPrice: z.number().positive().max(1000000),
  productCurrency: z.string().length(3).toUpperCase(),
  productImage: z.string().url().max(2000).optional(),
  store: z.string().min(1).max(100).trim(),
  notes: z.string().max(1000).trim().optional(),
})

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(1000).trim().optional(),
})

export const analyzeProductSchema = z.object({
  productName: z.string().min(1).max(500).trim(),
  productPrice: z.number().positive().max(1000000),
  productUrl: z.string().url().max(2000),
  productDescription: z.string().max(5000).trim().optional(),
})

export const affiliateLinkSchema = z.object({
  productUrl: z.string().url().max(2000),
  store: z.string().min(1).max(100).trim(),
  productId: z.string().max(200).optional(),
})

export const shareComparisonSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  products: z.array(z.any()).min(1).max(10),
  isPublic: z.boolean().optional(),
  expiresInDays: z.number().int().positive().max(365).optional(),
})

export const notificationPreferencesSchema = z.object({
  price_drop_enabled: z.boolean().optional(),
  availability_enabled: z.boolean().optional(),
  deals_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
})

// Sanitization functions
export function sanitizeHtml(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
    return parsed.toString()
  } catch {
    throw new Error('Invalid URL')
  }
}

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      }
    }
    return { success: false, error: 'Validation failed' }
  }
}