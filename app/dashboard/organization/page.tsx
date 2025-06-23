import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OrganizationDashboard } from "@/components/dashboard/organization-dashboard"

export default async function OrganizationDashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Verify user is an organization
  const { data: orgData } = await supabase.from("organizations").select("*").eq("id", user.id).single()

  if (!orgData) {
    redirect("/auth/login")
  }

  return <OrganizationDashboard organization={orgData} />
}
