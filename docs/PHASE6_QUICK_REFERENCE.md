# Phase 6 Quick Reference Guide

## 🚀 Quick Start

### Running Tests
```bash
npm install  # Install test dependencies
npm test     # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Security Checklist
- ✅ All API routes use `verifyAuth()`
- ✅ All inputs validated with Zod schemas
- ✅ All user data protected by RLS
- ✅ No secrets in client code
- ✅ Rate limiting active on API routes

### Performance Checklist
- ✅ Database queries use indexes
- ✅ List queries limited to 50 records
- ✅ No N+1 query patterns
- ✅ Loading states prevent unnecessary renders

---

## 📁 New Files Created

### Security
- `middleware.ts` - Security headers, rate limiting, auth
- `lib/api/validation.ts` - Input validation schemas
- `lib/api/helpers-enhanced.ts` - Secure helpers

### SEO
- `app/sitemap.ts` - Dynamic sitemap
- `public/robots.txt` - Robot directives
- `app/layout-enhanced.tsx` - Enhanced metadata
- `public/manifest.json` - PWA manifest
- `next-sitemap.config.js` - Sitemap config

### Testing
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup
- `__tests__/api/search.test.ts` - API tests
- `__tests__/api/validation.test.ts` - Validation tests

### Documentation
- `docs/PHASE6_SECURITY_AUDIT.md` - Security report
- `docs/PHASE6_PERFORMANCE.md` - Performance report
- `docs/PHASE6_SEO.md` - SEO report
- `docs/PHASE6_COMPLETION.md` - Completion report
- `docs/PHASE6_QUICK_REFERENCE.md` - This file

---

## 🔐 Security Features

### Rate Limiting
```typescript
// Automatically applied to all /api/* routes
// 60 requests per minute per IP
// Returns 429 if exceeded
```

### Input Validation
```typescript
import { validateAndSanitize, searchSchema } from '@/lib/api/validation'

const validation = validateAndSanitize(searchSchema, body)
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 })
}
```

### Authentication
```typescript
import { verifyAuth } from '@/lib/api/helpers-enhanced'

const { userId, error: authError } = await verifyAuth()
if (authError) return authError
```

---

## ⚡ Performance Tips

### Database Queries
```typescript
// ✅ Good: Uses index, has limit
const { data } = await supabase
  .from('search_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50)

// ❌ Bad: No limit, could return thousands
const { data } = await supabase
  .from('search_history')
  .select('*')
  .eq('user_id', userId)
```

### React Components
```typescript
// ✅ Good: Proper dependencies
useEffect(() => {
  fetchData()
}, [userId, query])

// ❌ Bad: Missing dependencies
useEffect(() => {
  fetchData()
}, [])
```

---

## 🔍 SEO Best Practices

### Page Metadata
```typescript
// Add to each page
export const metadata: Metadata = {
  title: 'Page Title - SaveAI',
  description: 'Compelling description with keywords',
  openGraph: {
    title: 'Page Title',
    description: 'Description',
  },
}
```

### Structured Data
```typescript
// Add JSON-LD to pages
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

---

## 🧪 Writing Tests

### API Route Test
```typescript
import { POST } from '@/app/api/search/route'
import { NextRequest } from 'next/server'

it('should return 401 when not authenticated', async () => {
  const request = new NextRequest('http://localhost/api/search', {
    method: 'POST',
    body: JSON.stringify({ query: 'test' }),
  })
  
  const response = await POST(request)
  expect(response.status).toBe(401)
})
```

### Validation Test
```typescript
import { validateAndSanitize, searchSchema } from '@/lib/api/validation'

it('should accept valid input', () => {
  const result = validateAndSanitize(searchSchema, { query: 'test' })
  expect(result.success).toBe(true)
})
```

---

## 📊 Monitoring

### What to Monitor
- API response times (target: <200ms)
- Error rates (target: <1%)
- Rate limit hits
- Database query times
- Authentication failures

### Log Format
```json
{
  "type": "api_request",
  "endpoint": "/api/search",
  "method": "POST",
  "userId": "user-id",
  "timestamp": "2026-01-08T00:00:00.000Z"
}
```

---

## 🚨 Common Issues

### Issue: Rate Limit Exceeded
**Solution**: Implement Redis for distributed rate limiting

### Issue: Slow API Response
**Solution**: Check database indexes, add caching

### Issue: Authentication Fails
**Solution**: Verify Supabase credentials in environment

### Issue: RLS Policy Blocks Query
**Solution**: Check user_id matches auth.uid() in policy

---

## 📞 Support

### Documentation
- Security: `docs/PHASE6_SECURITY_AUDIT.md`
- Performance: `docs/PHASE6_PERFORMANCE.md`
- SEO: `docs/PHASE6_SEO.md`
- Complete Report: `docs/PHASE6_COMPLETION.md`

### Key Files
- Middleware: `middleware.ts`
- Validation: `lib/api/validation.ts`
- Auth Helpers: `lib/api/helpers-enhanced.ts`
- Tests: `__tests__/`

---

*Quick Reference v1.0 - Phase 6 Complete*