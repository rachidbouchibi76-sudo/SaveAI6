import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import axios from 'axios'
import { handleApiError, verifyAuth, validateRequiredFields, logApiRequest, type ApiResponse } from '@/lib/api/helpers'

interface AnalyzeRequest {
  productName: string
  productPrice: number
  productUrl: string
  productDescription?: string
}

interface AnalysisResult {
  summary: string
  pros: string[]
  cons: string[]
  suggestedAlternatives: Array<{
    name: string
    reason: string
  }>
  aiProvider: 'openai' | 'manus'
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AnalysisResult>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/analyze', 'POST', userId!)

    // Parse request body
    const body: AnalyzeRequest = await request.json()

    // Validate required fields
    const validationError = validateRequiredFields(body, ['productName', 'productPrice', 'productUrl'])
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    let analysisResult: AnalysisResult

    // Try OpenAI first (primary)
    if (process.env.OPENAI_API_KEY) {
      try {
        analysisResult = await analyzeWithOpenAI(body)
      } catch (openaiError) {
        console.error('[OpenAI Error]:', openaiError)
        // Fallback to Manus
        if (process.env.MANUS_API_KEY) {
          try {
            analysisResult = await analyzeWithManus(body)
          } catch (manusError) {
            console.error('[Manus Error]:', manusError)
            throw new Error('AI analysis services unavailable')
          }
        } else {
          throw new Error('No AI service configured')
        }
      }
    } else if (process.env.MANUS_API_KEY) {
      try {
        analysisResult = await analyzeWithManus(body)
      } catch (manusError) {
        console.error('[Manus Error]:', manusError)
        throw new Error('AI analysis service unavailable')
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'AI analysis requires OPENAI_API_KEY or MANUS_API_KEY to be configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

async function analyzeWithOpenAI(product: AnalyzeRequest): Promise<AnalysisResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const prompt = `Analyze this product and provide a structured response:

Product: ${product.productName}
Price: $${product.productPrice}
Description: ${product.productDescription || 'N/A'}

Provide:
1. A brief summary (2-3 sentences)
2. 3-5 pros
3. 3-5 cons
4. 2-3 suggested alternative products with reasons

Format as JSON with keys: summary, pros (array), cons (array), suggestedAlternatives (array of {name, reason})`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a product analysis expert. Provide honest, helpful analysis in JSON format only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0].message.content || '{}'
  const parsed = JSON.parse(content)

  return {
    summary: parsed.summary || 'Analysis completed',
    pros: Array.isArray(parsed.pros) ? parsed.pros : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons : [],
    suggestedAlternatives: Array.isArray(parsed.suggestedAlternatives) ? parsed.suggestedAlternatives : [],
    aiProvider: 'openai',
  }
}

async function analyzeWithManus(product: AnalyzeRequest): Promise<AnalysisResult> {
  const apiKey = process.env.MANUS_API_KEY

  if (!apiKey) {
    throw new Error('MANUS_API_KEY not configured')
  }

  const response = await axios.post(
    'https://api.manus.app/v1/analyze',
    {
      product_name: product.productName,
      product_price: product.productPrice,
      product_url: product.productUrl,
      description: product.productDescription,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  )

  const data = response.data

  return {
    summary: data.summary || data.description || 'Analysis completed',
    pros: Array.isArray(data.pros) ? data.pros : Array.isArray(data.advantages) ? data.advantages : [],
    cons: Array.isArray(data.cons) ? data.cons : Array.isArray(data.disadvantages) ? data.disadvantages : [],
    suggestedAlternatives: Array.isArray(data.alternatives) ? data.alternatives : Array.isArray(data.suggestedAlternatives) ? data.suggestedAlternatives : [],
    aiProvider: 'manus',
  }
}