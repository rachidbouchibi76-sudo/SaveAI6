-- SaveAI Phase 5 Database Schema Updates
-- Run this in your Supabase SQL Editor after the base schema

-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('price_drop', 'availability', 'deal')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_drop_enabled BOOLEAN DEFAULT TRUE,
  availability_enabled BOOLEAN DEFAULT TRUE,
  deals_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- ADVANCED SEARCH FILTERS
-- ============================================

-- Add filters column to search_history
ALTER TABLE search_history ADD COLUMN IF NOT EXISTS filters JSONB;

-- ============================================
-- SHARED COMPARISONS
-- ============================================

-- Shared comparisons table for export & sharing feature
CREATE TABLE IF NOT EXISTS shared_comparisons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token VARCHAR(100) UNIQUE NOT NULL,
  title TEXT,
  products JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for shared_comparisons
CREATE INDEX IF NOT EXISTS idx_shared_comparisons_user_id ON shared_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_comparisons_share_token ON shared_comparisons(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_comparisons_expires_at ON shared_comparisons(expires_at);

-- Enable RLS for shared_comparisons
ALTER TABLE shared_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_comparisons
CREATE POLICY "Users can view their own shared comparisons"
  ON shared_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public comparisons are viewable by anyone"
  ON shared_comparisons FOR SELECT
  USING (is_public = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Users can insert their own shared comparisons"
  ON shared_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared comparisons"
  ON shared_comparisons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared comparisons"
  ON shared_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PRICE TRACKING
-- ============================================

-- Price history table for tracking price changes
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  saved_product_id UUID NOT NULL REFERENCES saved_products(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for price_history
CREATE INDEX IF NOT EXISTS idx_price_history_saved_product_id ON price_history(saved_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at DESC);

-- Enable RLS for price_history
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_history
CREATE POLICY "Users can view price history of their saved products"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_products
      WHERE saved_products.id = price_history.saved_product_id
      AND saved_products.user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to cleanup expired shared comparisons
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
  DELETE FROM shared_comparisons
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You can schedule this function to run periodically using pg_cron or similar