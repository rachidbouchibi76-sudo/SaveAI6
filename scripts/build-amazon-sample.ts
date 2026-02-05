import fs from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'

// Create CommonJS `require` in ESM context and load duckdb
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const duckdb = require('duckdb')

const PARQUET_DIR = path.join(process.cwd(), 'data', 'amazon', 'parquet')
const SPECIFIC_PARQUET = path.join(PARQUET_DIR, 'raw_meta_Electronics', 'full-00000-of-00010.parquet')
const OUT_DIR = path.join(process.cwd(), 'data', 'amazon')
const OUT_FILE = path.join(OUT_DIR, 'amazon-products.sample.json')

const DEFAULT_SAMPLE_SIZE = parseInt(process.env.SAMPLE_SIZE || '1000', 10)
const SAMPLE_SIZE = isNaN(DEFAULT_SAMPLE_SIZE) ? 1000 : DEFAULT_SAMPLE_SIZE

function normalizeRow(row: any) {
  const id = row.asin || row.id || row.product_id || `amazon-${Date.now()}-${Math.random()}`
  const name = row.title || row.name || row.product_title || row.product_name || row.summary || ''

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
    category: row.category || row.product_category || undefined,
    brand: row.brand || undefined,
    description: row.description || row.product_description || row.summary || undefined,
    metadata: row,
  }

  return product
}

async function build(sampleSize: number) {
  if (!fs.existsSync(PARQUET_DIR)) {
    console.error('[build-amazon-sample] Parquet directory not found:', PARQUET_DIR)
    process.exitCode = 2
    return
  }

  await mkdir(OUT_DIR, { recursive: true })

  const db = new duckdb.Database(':memory:')
  const conn = db.connect()

  let parquetGlob = ''
  if (fs.existsSync(SPECIFIC_PARQUET)) {
    parquetGlob = SPECIFIC_PARQUET
  } else {
    parquetGlob = path.join(PARQUET_DIR, '*.parquet')
  }

  const sql = `SELECT to_json(t) AS json FROM (SELECT * FROM read_parquet('${parquetGlob}') LIMIT ${sampleSize}) t`

  console.log('[build-amazon-sample] Running query:', sql)

  conn.all(sql, (err: any, rows: any[]) => {
    if (err) {
      console.error('[build-amazon-sample] DuckDB query failed:', err)
      process.exitCode = 1
      return
    }

    const parsedRows = (rows || []).map(r => {
      try { return JSON.parse(r.json) } catch (e) { return {} }
    })

    const sample = parsedRows.map(r => normalizeRow(r)).slice(0, sampleSize)

    fs.writeFileSync(OUT_FILE, JSON.stringify(sample, null, 2), 'utf-8')
    console.log(`[build-amazon-sample] Wrote ${sample.length} items to ${OUT_FILE}`)

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

build(sizeArg).catch((err) => {
  console.error('[build-amazon-sample] Unexpected error:', err)
  process.exitCode = 1
})
