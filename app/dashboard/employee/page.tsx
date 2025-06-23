import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard"

export default async function EmployeeDashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Verify user is an employee
  const { data: empData } = await supabase.from("employees").select("*").eq("email", user.email).single()

  if (!empData) {
    redirect("/auth/login")
  }

  return <EmployeeDashboard employee={empData} />
}
