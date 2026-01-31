import { ProductDataSource } from './ProductDataSource'

export class AmazonApiDataSource implements ProductDataSource {
  constructor(private options: Record<string, any> = {}) {}

  async fetch(query?: string): Promise<any[]> {
    // Stubbed API data source: intentionally returns empty set when not configured
    return []
  }

  async isAvailable(): Promise<boolean> {
    // Consider API available only when API key or configuration present
    return !!process.env.AMAZON_API_KEY
  }
}