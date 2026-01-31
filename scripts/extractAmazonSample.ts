import fs from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'

// Create CommonJS `require` in ESM context and load duckdb
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const duckdb = require('duckdb')

const PARQUET_DIR = path.join(process.cwd(), 'data', 'amazon', 'parquet')
const SAMPLE_DIR = path.join(process.cwd(), 'data', 'amazon', 'samples')
const SAMPLE_FILE = path.join(SAMPLE_DIR, 'amazon-products.sample.json')

const DEFAULT_SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || '200', 10)
const SAMPLE_SIZE = isNaN(DEFAULT_SAMPLE_SIZE) ? 200 : DEFAULT_SAMPLE_SIZE

function normalizeRow(row: any) {
  // Heuristics to map arbitrary Parquet row fields to Product
  const id = row.asin || row.id || row.product_id || `amazon-${Date.now()}-${Math.random()}`
  const name = row.title || row.name || row.product_title || row.product_name || row.summary || ''

  // Price may not be present in this dataset; parse if available
  let price = 0
  if (row.price) price = parseFloat(String(row.price).replace(/[^0-9.-]+/g, '')) || 0
  if (!price && row.list_price) price = parseFloat(String(row.list_price).replace(/[^0-9.-]+/g, '')) || 0

  const product = {
    id,
    name,
    price,
    currency: row.currency || 'USD',
    image: row.image_url || row.image || row.main_image || '',
    url: row.product_url || row.url || '',
    store: 'amazon',
    rating: row.rating ? parseFloat(String(row.rating)) : undefined,
    reviews: row.reviews_count ? parseInt(String(row.reviews_count), 10) : undefined,
    originalPrice: row.list_price ? parseFloat(String(row.list_price)) : undefined,
    savings: undefined,
    savingsPercent: undefined,
    category: row.category || row.product_category || undefined,
    brand: row.brand || undefined,
    description: row.description || row.product_description || row.summary || undefined,
    metadata: row,
  }

  return product
}

async function extractSample(sampleSize: number) {
  if (!fs.existsSync(PARQUET_DIR)) {
    console.error('[extractAmazonSample] Parquet directory not found:', PARQUET_DIR)
    process.exitCode = 2
    return
  }

  await mkdir(SAMPLE_DIR, { recursive: true })

  const db = new duckdb.Database(':memory:')
  const conn = db.connect()

  // Use DuckDB to read parquet files via glob and limit the number of rows
  const parquetGlob = path.join(PARQUET_DIR, '*.parquet')
  const sql = `SELECT to_json(t) AS json FROM (SELECT * FROM read_parquet('${parquetGlob}') LIMIT ${sampleSize}) t`

  console.log('[extractAmazonSample] Running query:', sql)

  conn.all(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error('[extractAmazonSample] DuckDB query failed:', err)
      process.exitCode = 1
      return
    }

    const parsedRows = (rows || []).map(r => {
      try { return JSON.parse(r.json) } catch (e) { return {} }
    })

    const sample = parsedRows.map(r => normalizeRow(r)).slice(0, sampleSize)

    fs.writeFileSync(SAMPLE_FILE, JSON.stringify(sample, null, 2), 'utf-8')
    console.log(`[extractAmazonSample] Wrote ${sample.length} items to ${SAMPLE_FILE}`)

    try {
      conn.close()
    } catch (e) {
      // ignore
    }
  })
}

// CLI
const args = process.argv.slice(2)
let sizeArg = SAMPLE_SIZE
for (const arg of args) {
  if (arg.startsWith('--sampleSize=')) {
    const v = parseInt(arg.split('=')[1], 10)
    if (!isNaN(v)) sizeArg = v
  }
}

extractSample(sizeArg).catch((err) => {
  console.error('[extractAmazonSample] Unexpected error:', err)
  process.exitCode = 1
})
