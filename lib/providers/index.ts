/**
 * Provider Registry
 * Central export point for all provider implementations
 */

export type { ProductProvider } from './ProductProvider'
export { BaseProductProvider } from './ProductProvider'
export { AmazonFileProvider } from './AmazonFileProvider'
export { SheinFileProvider } from './SheinFileProvider'
export { AmazonProvider } from './AmazonProvider'
export { SheinProvider } from './SheinProvider'
export { AmazonFileDataSource } from './data/AmazonFileDataSource'
export { AmazonApiDataSource } from './data/AmazonApiDataSource'
export { SheinFileDataSource } from './data/SheinFileDataSource'
export { SheinApiDataSource } from './data/SheinApiDataSource'

export type { Product, SearchInput, ProviderSearchResult } from '@/lib/types/product'