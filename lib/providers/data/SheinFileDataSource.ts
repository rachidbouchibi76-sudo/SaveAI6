import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { ProductDataSource } from './ProductDataSource'

export class SheinFileDataSource implements ProductDataSource {
  private dataFilePath: string

  constructor(dataFilePath: string = join(process.cwd(), 'data', 'shein-products.json')) {
    this.dataFilePath = dataFilePath
  }

  async fetch(query?: string, limit: number = 20): Promise<any[]> {
    if (!existsSync(this.dataFilePath)) return []

    try {
      const content = await readFile(this.dataFilePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed)) return []
      if (!query) return parsed.slice(0, limit)
      const q = query.toLowerCase()
      return parsed.filter(p => (p.goods_name || p.name || p.title || '').toLowerCase().includes(q)).slice(0, limit)
    } catch (err) {
      console.error('[SheinFileDataSource] fetch error:', err)
      return []
    }
  }

  async isAvailable(): Promise<boolean> {
    return existsSync(this.dataFilePath)
  }
}