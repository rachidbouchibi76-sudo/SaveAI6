import { Product, SearchInput } from '@/lib/types/product'

const MAX_MATCHES = 30
const PRICE_BAND_TOLERANCE = 0.4

interface AttributeProfile {
  storage?: number
  screenSize?: number
  keywords: Set<string>
}

export function matchProducts(
  input: SearchInput,
  candidates: Product[]
): Product[] {
  const validCandidates = candidates.filter(isValidProduct)
  
  const uniqueCandidates = removeDuplicates(validCandidates)
  
  const originalStore = input.extractedProduct?.store?.toLowerCase()
  const sourcePrice = input.extractedProduct?.price
  
  // Extract attributes from source product
  const sourceTitle = input.extractedProduct?.name || input.query
  const sourceAttributes = extractAttributes(sourceTitle)
  
  const filtered = uniqueCandidates.filter(candidate => {
    if (originalStore && candidate.platform.toLowerCase() === originalStore) {
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
    
    // Hard Filter 1: Reject candidates with missing critical fields
    if (!candidate.price || isNaN(candidate.price) || !candidate.title) {
      return false
    }
    
    // Hard Filter 2: Enforce price band (±40% of source product)
    if (sourcePrice && sourcePrice > 0) {
      const lowerBound = sourcePrice * (1 - PRICE_BAND_TOLERANCE)
      const upperBound = sourcePrice * (1 + PRICE_BAND_TOLERANCE)
      if (candidate.price < lowerBound || candidate.price > upperBound) {
        return false
      }
    }
    
    // Hard Filter 3: Reject major category mismatches
    if (!isCategoryAcceptable(input, candidate)) {
      return false
    }
    
    // Attribute Matching: Reject conflicting extracted attributes
    const candidateAttributes = extractAttributes(candidate.title)
    if (!attributesCompatible(sourceAttributes, candidateAttributes)) {
      return false
    }
    
    return true
  })
  
  return filtered.slice(0, MAX_MATCHES)
}

function isValidProduct(product: Product): boolean {
  return !!(
    product.id &&
    product.title &&
    typeof product.price === 'number' &&
    !isNaN(product.price)
  )
}

function removeDuplicates(products: Product[]): Product[] {
  const seen = new Set<string>()
  return products.filter(product => {
    const key = `${product.platform.toLowerCase()}-${product.id}`
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

function isCategoryAcceptable(input: SearchInput, candidate: Product): boolean {
  const sourceCategory = input.extractedProduct?.category
  if (!sourceCategory || !candidate.category) return true
  
  const normalized1 = normalizeCategory(sourceCategory)
  const normalized2 = normalizeCategory(candidate.category)
  
  // Check for major mismatches (e.g., phone vs accessory)
  const majorMismatches = [
    ['phone', 'accessory'],
    ['phone', 'case'],
    ['phone', 'charger'],
    ['phone', 'cable'],
    ['phone', 'screen protector'],
    ['laptop', 'bag'],
    ['laptop', 'mouse'],
    ['laptop', 'keyboard'],
  ]
  
  for (const [cat1, cat2] of majorMismatches) {
    if ((normalized1.includes(cat1) && normalized2.includes(cat2)) ||
        (normalized1.includes(cat2) && normalized2.includes(cat1))) {
      return false
    }
  }
  
  return true
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
  const candidateName = normalizeTitle(candidate.title)
  
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

function extractAttributes(text: string): AttributeProfile {
  const normalized = normalizeTitle(text)
  
  // Extract storage capacity (e.g., 64GB, 128GB, 256GB)
  const storageMatch = text.match(/(\d+)\s*gb/i)
  const storage = storageMatch ? parseInt(storageMatch[1], 10) : undefined
  
  // Extract screen size (e.g., 6.1", 15.6")
  const screenMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:inch|"|″)/i)
  const screenSize = screenMatch ? parseFloat(screenMatch[1]) : undefined
  
  // Extract keywords (wireless, fast charge, case, cable, etc.)
  const keywordPatterns = {
    wireless: /wireless/i,
    fastcharge: /fast.?charge|quick.?charge/i,
    case: /case|cover/i,
    cable: /cable|cord/i,
    charger: /charger/i,
    headphones: /headphones|earbuds|earphones/i,
    laptop: /laptop|notebook|macbook/i,
    phone: /phone|smartphone|iphone|galaxy|pixel/i,
    tablet: /tablet|ipad/i,
  }
  
  const keywords = new Set<string>()
  Object.entries(keywordPatterns).forEach(([keyword, pattern]) => {
    if (pattern.test(normalized)) {
      keywords.add(keyword)
    }
  })
  
  return { storage, screenSize, keywords }
}

function attributesCompatible(
  source: AttributeProfile,
  candidate: AttributeProfile
): boolean {
  // Storage must match if both specified
  if (source.storage !== undefined && candidate.storage !== undefined) {
    if (Math.abs(source.storage - candidate.storage) > 5) {
      return false
    }
  }
  
  // Screen size must match if both specified (within 0.3 inches)
  if (source.screenSize !== undefined && candidate.screenSize !== undefined) {
    if (Math.abs(source.screenSize - candidate.screenSize) > 0.3) {
      return false
    }
  }
  
  // Check for conflicting keywords
  const incompatiblePairs = [
    ['wireless', 'wired'],
    ['fastcharge', 'slow charge'],
    ['case', 'bare'],
  ]
  
  for (const [kw1, kw2] of incompatiblePairs) {
    if (source.keywords.has(kw1) && candidate.keywords.has(kw2)) {
      return false
    }
    if (source.keywords.has(kw2) && candidate.keywords.has(kw1)) {
      return false
    }
  }
  
  return true
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