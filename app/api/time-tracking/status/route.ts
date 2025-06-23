import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get("task_id")
    const employeeId = searchParams.get("employee_id")

    // Get employee info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    let query = supabase
      .from("time_entries")
      .select(`
        *,
        tasks!inner(id, task_name, status),
        projects!inner(id, name)
      `)
      .eq("employee_id", employee.id)

    if (taskId) {
      query = query.eq("task_id", taskId)
    }

    const { data: timeEntries, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({
      time_entries: timeEntries,
      employee_status: employee.is_active ? "online" : "offline",
    })
  } catch (error) {
    console.error("Error fetching time tracking status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
