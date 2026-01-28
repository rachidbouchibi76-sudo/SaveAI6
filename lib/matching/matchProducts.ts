import { Product, SearchInput } from '@/lib/types/product'

const MAX_MATCHES = 30

export function matchProducts(
  input: SearchInput,
  candidates: Product[]
): Product[] {
  const validCandidates = candidates.filter(isValidProduct)
  
  const uniqueCandidates = removeDuplicates(validCandidates)
  
  const originalStore = input.extractedProduct?.store?.toLowerCase()
  
  const filtered = uniqueCandidates.filter(candidate => {
    if (originalStore && candidate.store.toLowerCase() === originalStore) {
      return false
    }
    
    if (!passesCategoryMatch(input, candidate)) {
      return false
    }
    
    if (!passesTitleSimilarity(input, candidate)) {
      return false
    }
    
    if (!passesPriceRange(input, candidate)) {
      return false
    }
    
    return true
  })
  
  return filtered.slice(0, MAX_MATCHES)
}

function isValidProduct(product: Product): boolean {
  return !!(
    product.id &&
    product.name &&
    typeof product.price === 'number' &&
    !isNaN(product.price)
  )
}

function removeDuplicates(products: Product[]): Product[] {
  const seen = new Set<string>()
  return products.filter(product => {
    const key = `${product.store.toLowerCase()}-${product.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function passesCategoryMatch(input: SearchInput, candidate: Product): boolean {
  const extractedCategory = input.extractedProduct?.category
  const constraintCategories = input.constraints?.categories
  
  if (!extractedCategory && (!constraintCategories || constraintCategories.length === 0)) {
    return true
  }
  
  const candidateCategory = candidate.category?.toLowerCase().trim()
  
  if (!candidateCategory) {
    return true
  }
  
  if (extractedCategory) {
    const normalizedExtracted = normalizeCategory(extractedCategory)
    const normalizedCandidate = normalizeCategory(candidateCategory)
    
    if (areCategoriesCompatible(normalizedExtracted, normalizedCandidate)) {
      return true
    }
  }
  
  if (constraintCategories && constraintCategories.length > 0) {
    return constraintCategories.some(cat => {
      const normalizedConstraint = normalizeCategory(cat)
      const normalizedCandidate = normalizeCategory(candidateCategory)
      return areCategoriesCompatible(normalizedConstraint, normalizedCandidate)
    })
  }
  
  return extractedCategory ? false : true
}

function normalizeCategory(category: string): string {
  return category.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
}

function areCategoriesCompatible(cat1: string, cat2: string): boolean {
  if (cat1 === cat2) return true
  if (cat1.includes(cat2) || cat2.includes(cat1)) return true
  
  const parts1 = cat1.split(/\s+/)
  const parts2 = cat2.split(/\s+/)
  const sharedParts = parts1.filter(p => parts2.includes(p) && p.length > 2)
  
  return sharedParts.length >= 1
}

function passesTitleSimilarity(input: SearchInput, candidate: Product): boolean {
  const query = normalizeTitle(input.query)
  const extractedName = input.extractedProduct?.name ? normalizeTitle(input.extractedProduct.name) : null
  const candidateName = normalizeTitle(candidate.name)
  
  if (!candidateName) return false
  
  if (candidateName.includes(query) || query.includes(candidateName)) {
    return true
  }
  
  if (extractedName) {
    if (candidateName.includes(extractedName) || extractedName.includes(candidateName)) {
      return true
    }
    
    const extractedKeywords = getKeywords(extractedName)
    const candidateKeywords = getKeywords(candidateName)
    const sharedCount = countSharedKeywords(extractedKeywords, candidateKeywords)
    
    if (sharedCount >= 2) {
      return true
    }
  }
  
  const queryKeywords = getKeywords(query)
  const candidateKeywords = getKeywords(candidateName)
  const sharedCount = countSharedKeywords(queryKeywords, candidateKeywords)
  
  return sharedCount >= 1
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function getKeywords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 2)
}

function countSharedKeywords(keywords1: string[], keywords2: string[]): number {
  return keywords1.filter(kw => keywords2.includes(kw)).length
}

function passesPriceRange(input: SearchInput, candidate: Product): boolean {
  const minPrice = input.constraints?.minPrice
  const maxPrice = input.constraints?.maxPrice
  
  if (minPrice === undefined && maxPrice === undefined) {
    return true
  }
  
  const price = candidate.price
  
  if (minPrice !== undefined && price < minPrice) {
    return false
  }
  
  if (maxPrice !== undefined && price > maxPrice) {
    return false
  }
  
  return true
}