import { readFile, readdir } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { ProductDataSource } from './ProductDataSource'
import parquet from 'parquetjs-lite'

export class AmazonFileDataSource implements ProductDataSource {
  private dataFilePath: string
  private readonly DEFAULT_LIMIT = 20

  constructor(dataFilePath: string = join(process.cwd(), 'data', 'amazon-products.json')) {
    this.dataFilePath = dataFilePath
  }

  /**
   * Fetch raw entries matching the optional query, up to the provided limit.
   * Streams Parquet files when a directory is provided to avoid loading the entire dataset.
   */
  async fetch(query?: string, limit: number = this.DEFAULT_LIMIT): Promise<any[]> {
    // If the path points to a JSON file, keep previous behavior
    try {
      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) {
        const content = await readFile(this.dataFilePath, 'utf-8')
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return []
        if (!query) return parsed.slice(0, limit)
        const q = query.toLowerCase()
        return parsed.filter(p => (p.title || p.name || '').toLowerCase().includes(q)).slice(0, limit)
      }

      // If the path is a directory, iterate parquet files inside
      const dirPath = this.dataFilePath
      const entries = await readdir(dirPath)
      const parquetFiles = entries.filter(f => f.endsWith('.parquet')).sort()
      const results: any[] = []
      if (parquetFiles.length === 0) return []

      for (const fileName of parquetFiles) {
        const filePath = join(dirPath, fileName)
        try {
          const reader = await parquet.ParquetReader.openFile(filePath)
          const cursor = reader.getCursor()
          let record: any = null
          while ((record = await cursor.next())) {
            if (!query) {
              results.push(record)
            } else {
              const title = (record.title || record.name || '') + ''
              if (title.toLowerCase().includes(query.toLowerCase())) {
                results.push(record)
              }
            }
            if (results.length >= limit) break
          }
          await reader.close()
        } catch (err) {
          console.error('[AmazonFileDataSource] parquet read error for', fileName, err)
        }
        if (results.length >= limit) break
      }

      return results
    } catch (err) {
      console.error('[AmazonFileDataSource] fetch error:', err)
      return []
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) return true
      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isDirectory()) {
        const items = await readdir(this.dataFilePath)
        return items.some(f => f.endsWith('.parquet'))
      }
      return false
    } catch (err) {
      return false
    }
  }
}