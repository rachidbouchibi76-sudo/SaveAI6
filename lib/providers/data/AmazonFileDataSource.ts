import { readFile } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { ProductDataSource } from './ProductDataSource'

export class AmazonFileDataSource implements ProductDataSource {
  private dataFilePath: string
  private readonly DEFAULT_LIMIT = 20

  constructor(dataFilePath: string = join(process.cwd(), 'data', 'amazon-products.json')) {
    this.dataFilePath = dataFilePath
  }

  /**
   * Fetch raw entries matching the optional query, up to the provided limit.
   * Priority: sample JSON -> legacy JSON file -> []
   * NOTE: This implementation intentionally avoids any native modules (DuckDB)
   * so it is safe to run on Vercel Serverless/Edge environments.
   */
  async fetch(query?: string, limit: number = this.DEFAULT_LIMIT): Promise<any[]> {
    try {
      const sampleFile = join(process.cwd(), 'data', 'amazon', 'samples', 'amazon-products.sample.json')

      // 1) If sample JSON exists, use it
      if (existsSync(sampleFile) && statSync(sampleFile).isFile()) {
        const content = await readFile(sampleFile, 'utf-8')
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return []
        if (!query) return parsed.slice(0, limit)
        const q = query.toLowerCase()
        return parsed.filter(p => ((p.name || p.title || '') + '').toLowerCase().includes(q)).slice(0, limit)
      }

      // 2) Legacy: if dataFilePath is a JSON file
      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) {
        const content = await readFile(this.dataFilePath, 'utf-8')
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return []
        if (!query) return parsed.slice(0, limit)
        const q = query.toLowerCase()
        return parsed.filter(p => ((p.title || p.name || '') + '').toLowerCase().includes(q)).slice(0, limit)
      }

      return []
    } catch (err) {
      console.error('[AmazonFileDataSource] fetch error:', err)
      return []
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const sampleFile = join(process.cwd(), 'data', 'amazon', 'samples', 'amazon-products.sample.json')

      if (existsSync(sampleFile) && statSync(sampleFile).isFile()) return true

      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) return true

      return false
    } catch (err) {
      return false
    }
  }
}