import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { employee_id } = body

    if (!employee_id) {
      return NextResponse.json({ error: "Employee ID required" }, { status: 400 })
    }

    // Get the employee record
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Get the user's auth record using admin client
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(employee_id)

    if (authError || !authUser.user) {
      return NextResponse.json({ error: "Auth user not found" }, { status: 404 })
    }

    // Check if email is verified in auth
    const isEmailVerified = authUser.user.email_confirmed_at !== null

    // Update the employee record
    const { data: updatedEmployee, error: updateError } = await supabase
      .from("employees")
      .update({
        email_verified: isEmailVerified,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employee_id)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json({ error: "Failed to update employee record" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      employee: updatedEmployee,
      message: "Email verification status synced successfully",
    })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
