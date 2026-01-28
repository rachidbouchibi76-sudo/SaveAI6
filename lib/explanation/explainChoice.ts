import { Product, SearchInput } from '@/lib/types/product'
import OpenAI from 'openai'

const SCORE_THRESHOLD = 0.05
const MAX_TOKENS = 80
const TEMPERATURE = 0.2

export async function explainChoice(
  input: SearchInput,
  rankedProducts: Product[]
): Promise<string> {
  if (rankedProducts.length < 2) {
    return generateFallbackExplanation(rankedProducts[0])
  }
  
  const top1 = rankedProducts[0] as any
  const top2 = rankedProducts[1] as any
  
  const scoreDiff = Math.abs((top1.score || 0) - (top2.score || 0))
  
  if (scoreDiff >= SCORE_THRESHOLD) {
    return generateFallbackExplanation(top1)
  }
  
  try {
    return await generateAIExplanation(input, top1, top2)
  } catch (error) {
    console.error('[AI Explanation] Error:', error)
    return generateFallbackExplanation(top1)
  }
}

function generateFallbackExplanation(product: Product): string {
  const price = product.price.toFixed(2)
  const rating = product.rating || 0
  const store = product.store
  
  return `Best alternative found at ${store} for $${price} with ${rating}/5 rating. This option offers the best overall value based on price, ratings, and reviews.`
}

async function generateAIExplanation(
  input: SearchInput,
  top1: Product,
  top2: Product
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    return generateFallbackExplanation(top1)
  }
  
  const openai = new OpenAI({ apiKey })
  
  const prompt = buildPrompt(input, top1, top2)
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a product comparison assistant. Provide a brief 2-3 sentence explanation comparing two products. Be concise and factual.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  })
  
  const explanation = response.choices[0]?.message?.content?.trim()
  
  if (!explanation) {
    return generateFallbackExplanation(top1)
  }
  
  return explanation
}

function buildPrompt(input: SearchInput, top1: Product, top2: Product): string {
  const data = {
    query: input.query,
    product1: {
      name: top1.name,
      price: top1.price,
      rating: top1.rating,
      store: top1.store,
    },
    product2: {
      name: top2.name,
      price: top2.price,
      rating: top2.rating,
      store: top2.store,
    }
  }
  
  return `Compare these two similar products and explain which is better in 2-3 sentences:\n\n${JSON.stringify(data, null, 2)}`
}