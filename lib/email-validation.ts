import { createAdminClient } from "@/lib/supabase/admin"

export async function checkEmailExists(email: string): Promise<{
  exists: boolean
  userType?: "organization" | "employee"
  organizationId?: string
}> {
  try {
    const adminSupabase = createAdminClient()

    // Check if user exists in auth
    const { data: authUsers, error: authError } = await adminSupabase.auth.admin.listUsers()

    if (authError) {
      console.error("Error checking auth users:", authError)
      return { exists: false }
    }

    const existingUser = authUsers.users.find((user) => user.email === email)

    if (!existingUser) {
      return { exists: false }
    }

    // Check if it's an organization
    const { data: orgData } = await adminSupabase.from("organizations").select("id").eq("id", existingUser.id).single()

    if (orgData) {
      return {
        exists: true,
        userType: "organization",
        organizationId: orgData.id,
      }
    }

    // Check if it's an employee
    const { data: empData } = await adminSupabase
      .from("employees")
      .select("organization_id")
      .eq("id", existingUser.id)
      .single()

    if (empData) {
      return {
        exists: true,
        userType: "employee",
        organizationId: empData.organization_id,
      }
    }

    return { exists: true } // User exists but type unknown
  } catch (error) {
    console.error("Error in checkEmailExists:", error)
    return { exists: false }
  }
}
