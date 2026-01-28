import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAuth, handleApiError } from "@/lib/api/helpers"

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: notifications || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/notifications - Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)
    const body = await request.json()

    const { id, read } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Notification ID is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: read !== undefined ? read : true })
      .eq("id", id)
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

// DELETE /api/notifications - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await verifyAuth(supabase)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // Delete single notification
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        data: { deleted: 1 },
      })
    } else {
      // Delete all notifications
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)

      if (error) throw error

      return NextResponse.json({
        success: true,
        data: { deleted: "all" },
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}