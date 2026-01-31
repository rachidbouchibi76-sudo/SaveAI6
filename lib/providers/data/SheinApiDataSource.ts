import { ProductDataSource } from './ProductDataSource'

export class SheinApiDataSource implements ProductDataSource {
  constructor(private options: Record<string, any> = {}) {}

  async fetch(query?: string): Promise<any[]> {
    // Stubbed API data source: intentionally returns empty set when not configured
    return []
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.SHEIN_API_KEY
  }
}