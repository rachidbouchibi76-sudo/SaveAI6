import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { handleApiError, verifyAuth, validateRequiredFields, logApiRequest, type ApiResponse } from '@/lib/api/helpers'

interface AffiliateRequest {
  productUrl: string
  store: string
  productId?: string
}

interface AffiliateResponse {
  affiliateUrl: string
  originalUrl: string
  store: string
  tracked: boolean
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AffiliateResponse>>> {
  try {
    // Verify authentication
    const { userId, error: authError } = await verifyAuth()
    if (authError) return authError

    logApiRequest('/api/affiliate', 'POST', userId!)

    // Parse request body
    const body: AffiliateRequest = await request.json()

    // Validate required fields
    const validationError = validateRequiredFields(body, ['productUrl', 'store'])
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    // Validate URL format
    if (!isValidUrl(body.productUrl)) {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 })
    }

    let affiliateUrl: string
    let tracked = false

    const storeLower = body.store.toLowerCase()

    // Generate real affiliate link based on store
    if (storeLower.includes('amazon')) {
      affiliateUrl = generateAmazonAffiliateLink(body.productUrl)
      tracked = !!process.env.AMAZON_ASSOCIATE_TAG
    } else if (process.env.ADMITAD_API_KEY) {
      try {
        affiliateUrl = await generateAdmitadAffiliateLink(body.productUrl, body.store)
        tracked = true
      } catch (error) {
        console.error('[Admitad Error]:', error)
        affiliateUrl = body.productUrl
        tracked = false
      }
    } else {
      // No affiliate available
      affiliateUrl = body.productUrl
      tracked = false
    }

    // Final validation
    if (!isValidUrl(affiliateUrl)) {
      console.error('Generated invalid affiliate URL, using original')
      affiliateUrl = body.productUrl
      tracked = false
    }

    const response: AffiliateResponse = {
      affiliateUrl,
      originalUrl: body.productUrl,
      store: body.store,
      tracked,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function generateAmazonAffiliateLink(url: string): string {
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG

  if (!associateTag) {
    console.warn('AMAZON_ASSOCIATE_TAG not configured')
    return url
  }

  try {
    const urlObj = new URL(url)

    // Ensure it's an Amazon domain
    if (!urlObj.hostname.includes('amazon.')) {
      return url
    }

    // Remove existing tag if present
    urlObj.searchParams.delete('tag')

    // Add associate tag
    urlObj.searchParams.set('tag', associateTag)

    return urlObj.toString()
  } catch (error) {
    console.error('[Amazon Affiliate Error]:', error)
    return url
  }
}

async function generateAdmitadAffiliateLink(url: string, store: string): Promise<string> {
  const apiKey = process.env.ADMITAD_API_KEY
  const campaignId = process.env.ADMITAD_CAMPAIGN_ID

  if (!apiKey || !campaignId) {
    throw new Error('Admitad credentials not configured')
  }

  try {
    const response = await axios.post(
      'https://api.admitad.com/deeplink/generate/',
      {
        campaign_id: campaignId,
        url: url,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    )

    const deeplink = response.data.deeplink || response.data.url
    
    if (!deeplink || !isValidUrl(deeplink)) {
      throw new Error('Invalid deeplink returned from Admitad')
    }

    return deeplink
  } catch (error) {
    console.error('[Admitad Deeplink Error]:', error)
    throw error
  }
}