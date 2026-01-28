import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAuth, handleApiError } from "@/lib/api/helpers"
import { randomBytes } from "crypto"

// POST /api/share - Create a shareable comparison link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)
    const body = await request.json()

    const { title, products, isPublic, expiresInDays } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "Products array is required" },
        { status: 400 }
      )
    }

    // Generate unique share token
    const shareToken = randomBytes(16).toString("hex")

    // Calculate expiry date if specified
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    const { data, error } = await supabase
      .from("shared_comparisons")
      .insert({
        user_id: user.id,
        share_token: shareToken,
        title: title || "Product Comparison",
        products: products,
        is_public: isPublic !== undefined ? isPublic : true,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) throw error

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/share/${shareToken}`

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        shareUrl,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET /api/share?token=xxx - Get shared comparison
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Share token is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("shared_comparisons")
      .select("*")
      .eq("share_token", token)
      .single()

    if (error) throw error

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This share link has expired" },
        { status: 410 }
      )
    }

    // Check if public or user owns it
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!data.is_public && (!user || user.id !== data.user_id)) {
      return NextResponse.json(
        { success: false, error: "This comparison is private" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/share?id=xxx - Delete shared comparison
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Comparison ID is required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("shared_comparisons")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error) {
    return handleApiError(error)
  }
}