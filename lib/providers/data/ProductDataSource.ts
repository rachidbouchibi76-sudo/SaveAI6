export interface ProductDataSource {
  // Fetch raw provider-specific product entries (may be normalized later by Provider)
  // Optional limit parameter to avoid loading entire datasets
  fetch(query?: string, limit?: number): Promise<any[]>
  // Optional availability check
  isAvailable?(): Promise<boolean>
}