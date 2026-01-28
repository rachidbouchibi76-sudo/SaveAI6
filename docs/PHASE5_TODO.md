# SaveAI - Phase 5 Implementation Plan

## Overview
Adding advanced user-facing features to increase value and engagement while maintaining existing functionality.

## Implementation Order

### 5.1 USER DASHBOARD ✅
**Files to Create:**
- `/app/dashboard/page.tsx` - Main dashboard page
- `/components/dashboard/stats-card.tsx` - Statistics display component
- `/components/dashboard/recent-searches.tsx` - Recent search history component
- `/components/dashboard/saved-products-list.tsx` - Saved products display
- `/components/dashboard/account-settings.tsx` - User account settings

**Database Changes:**
- No new tables required (uses existing search_history and saved_products)

**Features:**
- Display user search history with pagination
- Display saved products with edit/delete options
- Show usage statistics (total searches, saved products, etc.)
- Account settings (name, email display)
- Authentication protection via useAuth hook

---

### 5.2 NOTIFICATIONS SYSTEM ✅
**Files to Create:**
- `/app/api/notifications/route.ts` - Notifications API endpoint
- `/app/api/notifications/preferences/route.ts` - User preferences API
- `/components/notifications/notification-bell.tsx` - Notification icon component
- `/components/notifications/notification-list.tsx` - Notifications display
- `/lib/email/send-notification.ts` - Email sending utility

**Database Changes:**
```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'price_drop', 'availability', 'deal'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  price_drop_enabled BOOLEAN DEFAULT TRUE,
  availability_enabled BOOLEAN DEFAULT TRUE,
  deals_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Features:**
- Price drop notifications (email only)
- Product availability alerts
- Special deals notifications
- User notification preferences
- Email integration via Supabase

---

### 5.3 ADVANCED COMPARISON ✅
**Files to Create:**
- `/app/compare/page.tsx` - Multi-product comparison page
- `/components/compare/comparison-table.tsx` - Side-by-side comparison
- `/components/compare/price-trend-chart.tsx` - Price visualization using recharts
- `/components/compare/add-product-dialog.tsx` - Add products to comparison
- `/lib/utils/comparison.ts` - Comparison utility functions

**Database Changes:**
- No new tables (uses existing search results)

**Features:**
- Multi-product comparison (up to 4 products)
- Side-by-side comparison table
- Price trend visualization
- Highlight best value option
- Personalized recommendations based on search history

---

### 5.4 EXPORT & SHARING ✅
**Files to Create:**
- `/app/api/export/pdf/route.ts` - PDF generation endpoint
- `/app/api/share/route.ts` - Share link generation
- `/components/export/export-dialog.tsx` - Export options dialog
- `/components/export/share-dialog.tsx` - Share options dialog
- `/lib/pdf/generate-comparison.ts` - PDF generation utility

**Dependencies to Add:**
- `jspdf` - PDF generation
- `jspdf-autotable` - Table formatting for PDF

**Features:**
- Export comparison results to PDF
- Share results via email
- Generate shareable links (with expiry)
- Copy comparison summaries to clipboard
- Privacy controls (public/private sharing)

---

### 5.5 ADVANCED SEARCH ✅
**Files to Create:**
- `/components/search/advanced-filters.tsx` - Filter panel component
- `/components/search/filter-chip.tsx` - Active filter display
- `/lib/utils/filters.ts` - Filter logic utilities
- `/app/api/search/filters/route.ts` - Filter options endpoint

**Database Changes:**
```sql
-- Add columns to search_history for filter tracking
ALTER TABLE search_history ADD COLUMN filters JSONB;
```

**Features:**
- Filter by category (Electronics, Fashion, Home, etc.)
- Filter by price range (slider component)
- Filter by brand
- Filter by rating (stars)
- Combine multiple filters
- Save filter preferences
- Fast client-side filtering

---

## Integration Points

### Existing Components to Reuse:
- `ProductCard` - For displaying products
- `AlternativeCard` - For alternatives
- `Button`, `Card`, `Input` - UI components
- `useAuth` hook - Authentication
- `apiClient` - API communication
- `toast` - User notifications

### Existing APIs to Extend:
- `/api/search` - Add filter support
- `/api/saved` - Add notification triggers
- `/api/history` - Add filter tracking

### Navigation Updates:
- Add Dashboard link to header
- Add Compare link to header
- Add Notifications bell icon to header

---

## Testing Checklist

- [ ] Dashboard displays correct user data
- [ ] Notifications are created and displayed
- [ ] Email notifications are sent
- [ ] Comparison table works with multiple products
- [ ] PDF export generates correctly
- [ ] Share links work and respect privacy
- [ ] Filters apply correctly to search results
- [ ] All features require authentication
- [ ] No breaking changes to existing functionality
- [ ] Mobile responsive design maintained

---

## Success Criteria

✅ All features implemented and functional
✅ No existing functionality broken
✅ Authentication properly enforced
✅ Database schema updated successfully
✅ UI/UX consistent with existing design
✅ Performance maintained (fast loading)
✅ Error handling implemented
✅ Mobile responsive