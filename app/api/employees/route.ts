import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkEmailExists } from "@/lib/email-validation"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const { data: employees, error } = await supabase
      .from("employees")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ employees })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()

    const { organization_id, email, first_name, last_name } = body

    if (!organization_id || !email || !first_name || !last_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if email already exists
    const emailCheck = await checkEmailExists(email)

    if (emailCheck.exists) {
      let errorMessage = ""

      if (emailCheck.userType === "organization") {
        errorMessage =
          "This email is already registered as an organization account. Please use a different email address."
      } else if (emailCheck.userType === "employee") {
        if (emailCheck.organizationId === organization_id) {
          errorMessage = "This employee is already part of your organization."
        } else {
          errorMessage =
            "This email is already registered as an employee in another organization. Please use a different email address."
        }
      } else {
        errorMessage = "An account already exists with this email address. Please use a different email."
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Check for duplicate within the same organization (additional safety check)
    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("email", email)
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        {
          error: "An employee with this email already exists in your organization.",
        },
        { status: 400 },
      )
    }

    // Get organization name for the invitation
    const { data: orgData } = await supabase
      .from("organizations")
      .select("company_name")
      .eq("id", organization_id)
      .single()

    // First, invite the user via Supabase Auth Admin
    const { data: authData, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name,
        last_name,
        organization_id,
        organization_name: orgData?.company_name || "Organization",
        user_type: "employee",
      },
      // Updated redirect URL to go directly to set-password page
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/set-password?type=invite`,
    })

    if (authError) {
      console.error("Auth invitation error:", authError)

      // Handle specific Supabase auth errors
      if (authError.message?.includes("User already registered")) {
        return NextResponse.json(
          {
            error: "An account with this email already exists. Please use a different email address.",
          },
          { status: 400 },
        )
      }

      return NextResponse.json({ error: `Failed to send invitation: ${authError.message}` }, { status: 400 })
    }

    // Then create the employee record using admin client
    const { data: employee, error: dbError } = await adminSupabase
      .from("employees")
      .insert({
        id: authData.user.id, // Use the auth user ID
        organization_id,
        email,
        first_name,
        last_name,
        is_active: true,
        email_verified: false,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      // If DB insert fails, we should clean up the auth user
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json(
      {
        employee,
        message: "Employee invited successfully. They will receive an email to set up their account.",
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
