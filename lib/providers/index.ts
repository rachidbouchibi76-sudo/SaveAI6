/**
 * Provider Registry
 * Central export point for all provider implementations
 */

export { ProductProvider, BaseProductProvider } from './ProductProvider'
export { AmazonFileProvider } from './AmazonFileProvider'
export { SheinFileProvider } from './SheinFileProvider'

export type { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'