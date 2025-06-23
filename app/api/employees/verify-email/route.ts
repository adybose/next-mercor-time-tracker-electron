import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get the current user to verify they're authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user's email is verified in auth
    const isEmailVerified = user.email_confirmed_at !== null

    // Update the employee record
    const { data: employee, error } = await supabase
      .from("employees")
      .update({
        email_verified: isEmailVerified,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update employee record" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      employee,
      message: "Email verification status updated successfully",
    })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
