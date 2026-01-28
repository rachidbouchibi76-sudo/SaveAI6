# SaveAI - Phase 3: Backend API Implementation

## ✅ Phase 3 Completion Summary

This document outlines the complete backend API implementation for SaveAI, an AI-powered price comparison platform.

---

## 📁 Files Added

### Core API Routes
- `/app/api/search/route.ts` - Product search endpoint
- `/app/api/analyze/route.ts` - AI analysis endpoint
- `/app/api/affiliate/route.ts` - Affiliate link generation
- `/app/api/history/route.ts` - Search history management
- `/app/api/history/retry/route.ts` - Retry previous searches
- `/app/api/saved/route.ts` - Saved products management

### Infrastructure
- `/lib/supabase/client.ts` - Browser Supabase client
- `/lib/supabase/server.ts` - Server Supabase client with service role
- `/lib/api/helpers.ts` - Centralized API utilities and security functions

### Configuration & Documentation
- `/.env.example` - Environment variables template
- `/database/schema.sql` - Database schema for Supabase
- `/README_PHASE3.md` - This documentation file

---

## 🔧 API Endpoints Overview

### 1. Search API
**Endpoint:** `POST /api/search`

**Purpose:** Accept product URLs or keywords, detect type, store search history, and return product comparisons.

**Request Body:**
```json
{
  "query": "https://amazon.com/product/123" // or "wireless headphones"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "wireless headphones",
    "type": "keyword",
    "urlType": null,
    "product": {
      "id": "prod_123",
      "name": "Premium Wireless Headphones",
      "price": 299.99,
      "currency": "USD",
      "image": "/placeholder.jpg",
      "url": "https://store.com/product",
      "store": "Store Name",
      "rating": 4.5,
      "reviews": 1234
    },
    "alternatives": [...],
    "cheapest": {...},
    "searchId": "uuid"
  }
}
```

**Features:**
- URL vs keyword detection
- Amazon URL type detection
- Automatic search history storage
- User authentication required

---

### 2. AI Analysis API
**Endpoint:** `POST /api/analyze`

**Purpose:** Generate AI-powered product analysis using OpenAI or Manus API.

**Request Body:**
```json
{
  "productName": "Wireless Headphones XYZ",
  "productPrice": 299.99,
  "productUrl": "https://store.com/product",
  "productDescription": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Detailed product analysis...",
    "pros": [
      "Excellent sound quality",
      "Long battery life",
      "Comfortable design"
    ],
    "cons": [
      "Expensive",
      "Limited color options"
    ],
    "suggestedAlternatives": [
      {
        "name": "Alternative Product A",
        "reason": "Better value for money"
      }
    ],
    "aiProvider": "openai"
  }
}
```

**Features:**
- OpenAI GPT-4 integration (primary)
- Manus API fallback
- Mock data fallback if no API keys configured
- Structured JSON responses
- User authentication required

---

### 3. Affiliate Links API
**Endpoint:** `POST /api/affiliate`

**Purpose:** Generate affiliate links for Amazon and other stores via Admitad.

**Request Body:**
```json
{
  "productUrl": "https://amazon.com/product/123",
  "store": "Amazon",
  "productId": "optional_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "affiliateUrl": "https://amazon.com/product/123?tag=your-tag-20",
    "originalUrl": "https://amazon.com/product/123",
    "store": "Amazon",
    "tracked": true
  }
}
```

**Features:**
- Amazon Associate tag integration
- Admitad API for other stores
- Fallback to direct URL if affiliate unavailable
- User authentication required

---

### 4. Search History API
**Endpoint:** `GET /api/history`

**Purpose:** Retrieve user's search history.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "query": "wireless headphones",
      "type": "keyword",
      "url_type": null,
      "result_count": 5,
      "cheapest_price": 249.99,
      "created_at": "2025-01-04T10:30:00Z"
    }
  ]
}
```

**Endpoint:** `DELETE /api/history?id=uuid` (or no ID to clear all)

**Purpose:** Delete single history item or clear entire history.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": 1
  }
}
```

**Features:**
- User-scoped queries (RLS enforced)
- Pagination (limit 50)
- Ordered by most recent
- User authentication required

---

### 5. History Retry API
**Endpoint:** `POST /api/history/retry`

**Purpose:** Re-run a previous search from history.

**Request Body:**
```json
{
  "historyId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "wireless headphones",
    "redirectUrl": "/search?q=wireless%20headphones"
  }
}
```

**Features:**
- Retrieves original query
- Returns redirect URL for frontend
- User authentication required

---

### 6. Saved Products API
**Endpoint:** `GET /api/saved`

**Purpose:** Retrieve user's saved products.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_name": "Wireless Headphones",
      "product_url": "https://store.com/product",
      "product_price": 299.99,
      "product_currency": "USD",
      "product_image": "/image.jpg",
      "store": "Store Name",
      "notes": "Want to buy on sale",
      "created_at": "2025-01-04T10:30:00Z",
      "updated_at": "2025-01-04T10:30:00Z"
    }
  ]
}
```

**Endpoint:** `POST /api/saved`

**Purpose:** Save a new product.

**Request Body:**
```json
{
  "productName": "Wireless Headphones",
  "productUrl": "https://store.com/product",
  "productPrice": 299.99,
  "productCurrency": "USD",
  "productImage": "/image.jpg",
  "store": "Store Name",
  "notes": "Optional notes"
}
```

**Endpoint:** `PATCH /api/saved`

**Purpose:** Update saved product (notes, etc.).

**Request Body:**
```json
{
  "id": "uuid",
  "notes": "Updated notes"
}
```

**Endpoint:** `DELETE /api/saved?id=uuid`

**Purpose:** Remove a saved product.

**Features:**
- Duplicate prevention
- User-scoped operations (RLS enforced)
- Notes field for user annotations
- User authentication required

---

## 🔒 Security Implementation

### Authentication
- All endpoints verify user authentication via `verifyAuth()` helper
- Uses Supabase Auth with JWT tokens
- Returns 401 Unauthorized for unauthenticated requests

### Authorization
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Database-level enforcement prevents data leaks

### Input Validation
- Required field validation on all endpoints
- Input sanitization to prevent XSS
- URL validation for link generation
- Length limits on user inputs

### Error Handling
- Centralized error handler (`handleApiError`)
- No sensitive information exposed in error messages
- Proper HTTP status codes
- Console logging for debugging (server-side only)

### API Keys
- All secrets stored in environment variables
- Never exposed to client-side code
- `.env.example` provided for reference

---

## 🗄️ Database Schema

### Tables Created

#### `search_history`
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- query (TEXT)
- type (VARCHAR: 'url' | 'keyword')
- url_type (VARCHAR: 'amazon' | 'other')
- result_count (INTEGER)
- cheapest_price (DECIMAL)
- created_at (TIMESTAMP)
```

#### `saved_products`
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- product_name (TEXT)
- product_url (TEXT)
- product_price (DECIMAL)
- product_currency (VARCHAR)
- product_image (TEXT)
- store (VARCHAR)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Indexes
- `idx_search_history_user_id`
- `idx_search_history_created_at`
- `idx_saved_products_user_id`
- `idx_saved_products_created_at`

### RLS Policies
- Users can only SELECT/INSERT/UPDATE/DELETE their own records
- Enforced at database level via `auth.uid()`

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Services
OPENAI_API_KEY=sk-your_openai_api_key
MANUS_API_KEY=your_manus_api_key

# Affiliate Configuration
AMAZON_ASSOCIATE_TAG=your-tag-20
ADMITAD_API_KEY=your_admitad_api_key
ADMITAD_CAMPAIGN_ID=your_campaign_id

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📦 Dependencies Added

```json
{
  "@supabase/supabase-js": "Latest",
  "openai": "Latest",
  "axios": "Latest"
}
```

Install with:
```bash
pnpm add @supabase/supabase-js openai axios
```

---

## 🚀 Setup Instructions

### 1. Database Setup
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the contents of `/database/schema.sql`
4. Verify tables and RLS policies are created

### 2. Environment Configuration
1. Copy `.env.example` to `.env.local`
2. Fill in all required environment variables
3. Ensure Supabase URL and keys are correct

### 3. Install Dependencies
```bash
cd /workspace/SaveAI--main
pnpm install
```

### 4. Run Development Server
```bash
pnpm run dev
```

### 5. Test API Endpoints
Use tools like Postman or curl to test endpoints:
```bash
# Example: Search API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "wireless headphones"}'
```

---

## ✅ Phase 3 Completion Checklist

- [x] **3.1 Core API Setup**
  - [x] Next.js App Router API structure
  - [x] Centralized error handling (`/lib/api/helpers.ts`)
  - [x] Authentication checks on all endpoints
  - [x] Console-based logging

- [x] **3.2 Search API**
  - [x] POST `/api/search` endpoint
  - [x] Input validation and sanitization
  - [x] URL vs keyword detection
  - [x] Amazon URL type detection
  - [x] Supabase search history storage
  - [x] Normalized response format

- [x] **3.3 AI Analysis API**
  - [x] POST `/api/analyze` endpoint
  - [x] OpenAI API integration
  - [x] Manus API integration (placeholder)
  - [x] Environment variable configuration
  - [x] Structured JSON responses
  - [x] Fallback to mock data

- [x] **3.4 Affiliate Links API**
  - [x] POST `/api/affiliate` endpoint
  - [x] Amazon Associate tag integration
  - [x] Admitad API integration (placeholder)
  - [x] Fallback to direct URLs
  - [x] Tracking status in response

- [x] **3.5 Search History API**
  - [x] GET `/api/history` endpoint
  - [x] DELETE `/api/history` (single & bulk)
  - [x] POST `/api/history/retry` endpoint
  - [x] User-scoped operations
  - [x] RLS enforcement

- [x] **3.6 Saved Products API**
  - [x] GET `/api/saved` endpoint
  - [x] POST `/api/saved` endpoint
  - [x] DELETE `/api/saved` endpoint
  - [x] PATCH `/api/saved` endpoint
  - [x] Duplicate prevention
  - [x] Notes functionality

- [x] **Security Requirements**
  - [x] Authentication verification on all routes
  - [x] User data isolation (RLS)
  - [x] Input validation and sanitization
  - [x] Response sanitization
  - [x] No exposed secrets

- [x] **Documentation**
  - [x] API endpoint documentation
  - [x] Request/response examples
  - [x] Security notes
  - [x] Setup instructions
  - [x] Database schema documentation

---

## 🔄 Integration with Frontend

The frontend (Phase 1 & 2) can now integrate these APIs:

### Example: Search Integration
```typescript
// In a React component
const handleSearch = async (query: string) => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  
  const result = await response.json()
  if (result.success) {
    setProducts(result.data.alternatives)
  }
}
```

### Example: Save Product
```typescript
const handleSaveProduct = async (product) => {
  const response = await fetch('/api/saved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productName: product.name,
      productUrl: product.url,
      productPrice: product.price,
      productCurrency: 'USD',
      store: product.store,
    }),
  })
  
  const result = await response.json()
  if (result.success) {
    toast.success('Product saved!')
  }
}
```

---

## 🎯 Next Steps

1. **Frontend Integration**: Connect existing UI components to these API endpoints
2. **Real Scraping**: Replace mock data in `/api/search` with actual web scraping or API integrations
3. **Price Tracking**: Add scheduled jobs to track price changes for saved products
4. **Notifications**: Implement email/push notifications for price drops
5. **Analytics**: Add usage analytics and monitoring
6. **Rate Limiting**: Implement rate limiting to prevent abuse
7. **Caching**: Add Redis or similar for caching search results

---

## 📝 Notes

- All API routes follow RESTful conventions
- Error responses include descriptive messages for debugging
- Mock data is used where external APIs aren't configured
- The system is designed to be production-ready with proper security
- Supabase RLS provides database-level security
- All endpoints require authentication except health checks

---

## 🐛 Troubleshooting

### "Unauthorized" errors
- Ensure user is signed in via Supabase Auth
- Check that JWT token is being sent in requests
- Verify Supabase configuration in `.env.local`

### Database errors
- Run `/database/schema.sql` in Supabase SQL Editor
- Check RLS policies are enabled
- Verify user_id matches auth.uid()

### API key errors
- Ensure all required environment variables are set
- Check API keys are valid and have proper permissions
- Review console logs for specific error messages

---

## 📧 Support

For issues or questions about Phase 3 implementation, please refer to:
- Supabase Documentation: https://supabase.com/docs
- OpenAI API Documentation: https://platform.openai.com/docs
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

**Phase 3 Status:** ✅ **COMPLETE**

All backend API routes have been successfully implemented following production-ready best practices with proper authentication, authorization, validation, and error handling.