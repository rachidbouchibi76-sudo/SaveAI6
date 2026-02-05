/**
 * Recommendation Explanation Generator
 * Uses OpenAI ONLY to generate human explanations for close recommendations
 * Never used for scoring, selection, or ranking—those are deterministic
 */

import { Product } from '@/lib/types/product'
import { ScoreBreakdown, RecommendedProduct } from '@/lib/recommendation/recommendProducts'

export interface ExplanationInput {
  topProduct: Product
  topScore: number
  topBreakdown: ScoreBreakdown
  runnerUpProduct?: Product
  runnerUpScore?: number
  runnerUpBreakdown?: ScoreBreakdown
}

export interface ExplanationResult {
  explanation: string
  generatedByAI: boolean
}

// Only invoke OpenAI when scores are close (within this threshold)
const SCORE_DIFFERENCE_THRESHOLD = 0.1 // 10 points

function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY
}

function isDifferenceTooLarge(topScore: number, runnerUpScore?: number): boolean {
  if (!runnerUpScore) return true // no runner-up to compare
  const diff = topScore - runnerUpScore
  return diff >= SCORE_DIFFERENCE_THRESHOLD
}

function generateDeterministicExplanation(
  topProduct: Product,
  topScore: number,
  topBreakdown: ScoreBreakdown,
  runnerUpProduct?: Product,
  runnerUpScore?: number
): string {
  const topName = topProduct.name || 'Product'
  const topStore = topProduct.store || 'unknown store'

  // If there's a clear winner (large score difference), give simple explanation
  if (!runnerUpProduct || isDifferenceTooLarge(topScore, runnerUpScore)) {
    const factors: string[] = []

    // Extract top 2 factors from breakdown
    const factorScores = [
      { name: 'price advantage', score: topBreakdown.priceAdvantage.contribution },
      { name: 'rating', score: topBreakdown.rating.contribution },
      { name: 'review count', score: topBreakdown.reviews.contribution },
      { name: 'shipping', score: topBreakdown.shipping.contribution },
      { name: 'availability', score: topBreakdown.availability.contribution },
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)

    for (const factor of factorScores) {
      if (factor.score > 0) {
        if (factor.name === 'price advantage') factors.push('better price')
        else if (factor.name === 'rating') factors.push('higher rating')
        else if (factor.name === 'review count') factors.push('more reviews')
        else if (factor.name === 'shipping') factors.push('better shipping')
        else if (factor.name === 'availability') factors.push('better availability')
      }
    }

    const factorText = factors.length ? ` because of ${factors.join(' and ')}.` : '.'

    if (runnerUpProduct) {
      return `${topName} from ${topStore} ranks first${factorText}`
    } else {
      return `${topName} from ${topStore} is the best option available${factorText}`
    }
  }

  // Close call - scores are similar
  const topName2 = topProduct.name || 'Option 1'
  const runnerUpName = runnerUpProduct?.name || 'Option 2'
  const runnerUpStore = runnerUpProduct?.store || 'another store'

  return `${topName2} edges out ${runnerUpName} from ${runnerUpStore} by a small margin. Both are strong options.`
}

async function generateAIExplanation(
  topProduct: Product,
  topScore: number,
  topBreakdown: ScoreBreakdown,
  runnerUpProduct: Product,
  runnerUpScore: number,
  runnerUpBreakdown: ScoreBreakdown
): Promise<string | null> {
  try {
    const { OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const topName = topProduct.name || 'Product'
    const topStore = topProduct.store || 'store'
    const runnerUpName = runnerUpProduct.name || 'Product'
    const runnerUpStore = runnerUpProduct.store || 'store'
    const topPrice = topProduct.price || 'unknown'
    const runnerUpPrice = runnerUpProduct.price || 'unknown'

    const factsText = `
Top recommendation: "${topName}" from ${topStore}
- Score: ${(topScore * 100).toFixed(0)}/100
- Price: $${topPrice}
- Rating: ${topBreakdown.rating.raw.toFixed(1)}/5
- Reviews: ${topBreakdown.reviews.raw}

Runner-up: "${runnerUpName}" from ${runnerUpStore}
- Score: ${(runnerUpScore * 100).toFixed(0)}/100
- Price: $${runnerUpPrice}
- Rating: ${runnerUpBreakdown.rating.raw.toFixed(1)}/5
- Reviews: ${runnerUpBreakdown.reviews.raw}
`.trim()

    const systemPrompt = `You are a product recommendation explainer. Your job is to explain why one product was chosen over another.

Rules:
- Write 2-3 sentences ONLY
- Use simple, conversational language
- ONLY reference the facts provided below
- Do NOT add information, prices, or specs not explicitly mentioned
- Do NOT suggest other products
- Explain the difference clearly but briefly`

    const userPrompt = `Given these two similar products, explain in 2-3 sentences why the top recommendation was chosen:

${factsText}

Keep it brief and factual.`

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    })

    const explanation = response.content[0].type === 'text' ? response.content[0].text.trim() : null
    if (!explanation) return null

    // Safety: ensure it's actually 2-3 sentences
    const sentenceCount = (explanation.match(/[.!?]/g) || []).length
    if (sentenceCount > 4) {
      return explanation.split(/[.!?]/).slice(0, 3).join('. ').trim() + '.'
    }

    return explanation
  } catch (error) {
    console.warn('[ExplainRecommendation] AI generation failed:', error)
    return null
  }
}

/**
 * Generate a human-readable explanation for why a product was recommended
 * OpenAI is called ONLY if scores are close; otherwise deterministic explanation
 * @param input Top product, runner-up, and score breakdowns
 * @returns Explanation string and flag indicating if AI was used
 */
export async function explainRecommendation(input: ExplanationInput): Promise<ExplanationResult> {
  // Check if we should attempt AI explanation (only for close scores)
  const shouldTryAI =
    isOpenAIConfigured() &&
    input.runnerUpProduct &&
    !isDifferenceTooLarge(input.topScore, input.runnerUpScore)

  if (shouldTryAI && input.runnerUpProduct && input.runnerUpScore !== undefined && input.runnerUpBreakdown) {
    const aiExplanation = await generateAIExplanation(
      input.topProduct,
      input.topScore,
      input.topBreakdown,
      input.runnerUpProduct,
      input.runnerUpScore,
      input.runnerUpBreakdown
    )

    if (aiExplanation) {
      return {
        explanation: aiExplanation,
        generatedByAI: true,
      }
    }
  }

  // Fallback to deterministic explanation
  const explanation = generateDeterministicExplanation(
    input.topProduct,
    input.topScore,
    input.topBreakdown,
    input.runnerUpProduct,
    input.runnerUpScore
  )

  return {
    explanation,
    generatedByAI: false,
  }
}

export default explainRecommendation
