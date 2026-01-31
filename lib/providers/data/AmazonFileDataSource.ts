import { readFile, readdir } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { ProductDataSource } from './ProductDataSource'

// Prefer DuckDB for reliable parquet access (streaming via SQL)
const duckdb = (() => {
  try {
    return require('duckdb')
  } catch (e) {
    return null
  }
})()

export class AmazonFileDataSource implements ProductDataSource {
  private dataFilePath: string
  private readonly DEFAULT_LIMIT = 20

  constructor(dataFilePath: string = join(process.cwd(), 'data', 'amazon-products.json')) {
    this.dataFilePath = dataFilePath
  }

  /**
   * Fetch raw entries matching the optional query, up to the provided limit.
   * Priority: Parquet dir -> sample JSON -> legacy JSON file -> []
   */
  async fetch(query?: string, limit: number = this.DEFAULT_LIMIT): Promise<any[]> {
    try {
      const parquetDir = join(process.cwd(), 'data', 'amazon', 'parquet')
      const sampleFile = join(process.cwd(), 'data', 'amazon', 'samples', 'amazon-products.sample.json')

      // 1) If parquet is available and duckdb is present, use it (streamed via SQL LIMIT)
      if (duckdb && existsSync(parquetDir) && statSync(parquetDir).isDirectory()) {
        try {
          const files = (await readdir(parquetDir)).filter(f => f.endsWith('.parquet'))
          if (files.length > 0) {
            const db = new duckdb.Database(':memory:')
            const conn = db.connect()
            const glob = join(parquetDir, '*.parquet')

            // We won't push query into SQL directly to avoid SQL injection; filter in JS after fetch
            const sql = `SELECT * FROM read_parquet('${glob}') LIMIT ${limit}`

            const rows: any[] = await new Promise((resolve, reject) => {
              conn.all(sql, (err: any, res: any[]) => {
                try { conn.close() } catch (e) {}
                if (err) return reject(err)
                return resolve(res || [])
              })
            })

            if (!query) return rows
            const q = query.toLowerCase()
            return rows.filter(r => ((r.title || r.name || '') + '').toLowerCase().includes(q)).slice(0, limit)
          }
        } catch (err) {
          console.error('[AmazonFileDataSource] duckdb/parquet error:', err)
          // fallthrough to sample/legacy
        }
      }

      // 2) If sample JSON exists, use it
      if (existsSync(sampleFile) && statSync(sampleFile).isFile()) {
        const content = await readFile(sampleFile, 'utf-8')
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return []
        if (!query) return parsed.slice(0, limit)
        const q = query.toLowerCase()
        return parsed.filter(p => ((p.name || p.title || '') + '').toLowerCase().includes(q)).slice(0, limit)
      }

      // 3) Legacy: if dataFilePath is a JSON file
      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) {
        const content = await readFile(this.dataFilePath, 'utf-8')
        const parsed = JSON.parse(content)
        if (!Array.isArray(parsed)) return []
        if (!query) return parsed.slice(0, limit)
        const q = query.toLowerCase()
        return parsed.filter(p => (p.title || p.name || '').toLowerCase().includes(q)).slice(0, limit)
      }

      return []
    } catch (err) {
      console.error('[AmazonFileDataSource] fetch error:', err)
      return []
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const parquetDir = join(process.cwd(), 'data', 'amazon', 'parquet')
      const sampleFile = join(process.cwd(), 'data', 'amazon', 'samples', 'amazon-products.sample.json')

      if (existsSync(parquetDir) && statSync(parquetDir).isDirectory()) {
        const items = await readdir(parquetDir)
        if (items.some(f => f.endsWith('.parquet'))) return true
      }

      if (existsSync(sampleFile) && statSync(sampleFile).isFile()) return true

      if (existsSync(this.dataFilePath) && statSync(this.dataFilePath).isFile()) return true

      return false
    } catch (err) {
      return false
    }
  }
}