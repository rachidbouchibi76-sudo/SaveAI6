-- SaveAI Database Schema
-- Run this in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('url', 'keyword')),
  url_type VARCHAR(20) CHECK (url_type IN ('amazon', 'other')),
  result_count INTEGER DEFAULT 0,
  cheapest_price DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Products Table
CREATE TABLE IF NOT EXISTS saved_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  product_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  product_image TEXT,
  store VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_products_user_id ON saved_products(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_products_created_at ON saved_products(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_history
CREATE POLICY "Users can view their own search history"
  ON search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
  ON search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
  ON search_history FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for saved_products
CREATE POLICY "Users can view their own saved products"
  ON saved_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved products"
  ON saved_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved products"
  ON saved_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved products"
  ON saved_products FOR DELETE
  USING (auth.uid() = user_id);