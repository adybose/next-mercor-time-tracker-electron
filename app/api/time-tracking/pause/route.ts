import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { task_id } = body

    if (!task_id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Get employee info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Get the active time entry
    const { data: timeEntry, error: timeEntryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .single()

    if (timeEntryError || !timeEntry) {
      return NextResponse.json({ error: "No active time entry found for this task" }, { status: 404 })
    }

    // Calculate current session time and add to total paused seconds
    const currentTime = new Date()
    const startTime = new Date(timeEntry.start_time)
    const sessionSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
    const totalActiveSeconds = sessionSeconds - (timeEntry.total_paused_seconds || 0)

    // Update time entry to paused state
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        is_active: false,
        last_pause_time: currentTime.toISOString(),
        updated_at: currentTime.toISOString(),
      })
      .eq("id", timeEntry.id)

    if (updateError) {
      console.error("Error updating time entry:", updateError)
      return NextResponse.json({ error: "Failed to pause time tracking" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Time tracking paused successfully",
      active_seconds: totalActiveSeconds,
    })
  } catch (error) {
    console.error("Error in pause time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
