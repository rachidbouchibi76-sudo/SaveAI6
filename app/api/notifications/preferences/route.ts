import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAuth, handleApiError } from "@/lib/api/helpers"

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)

    const { data: preferences, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error
    }

    // If no preferences exist, create default ones
    if (!preferences) {
      const { data: newPreferences, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: user.id,
          price_drop_enabled: true,
          availability_enabled: true,
          deals_enabled: true,
          email_enabled: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      return NextResponse.json({
        success: true,
        data: newPreferences,
      })
    }

    return NextResponse.json({
      success: true,
      data: preferences,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/notifications/preferences - Update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)
    const body = await request.json()

    const {
      price_drop_enabled,
      availability_enabled,
      deals_enabled,
      email_enabled,
    } = body

    const updates: any = { updated_at: new Date().toISOString() }

    if (price_drop_enabled !== undefined) updates.price_drop_enabled = price_drop_enabled
    if (availability_enabled !== undefined) updates.availability_enabled = availability_enabled
    if (deals_enabled !== undefined) updates.deals_enabled = deals_enabled
    if (email_enabled !== undefined) updates.email_enabled = email_enabled

    const { data, error } = await supabase
      .from("notification_preferences")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}