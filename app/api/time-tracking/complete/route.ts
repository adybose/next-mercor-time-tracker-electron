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
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (timeEntryError || !timeEntry) {
      return NextResponse.json({ error: "No time entry found for this task" }, { status: 404 })
    }

    const currentTime = new Date()
    const startTime = new Date(timeEntry.start_time)

    // Calculate total duration
    const totalSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000)
    const activeSeconds = totalSeconds - (timeEntry.total_paused_seconds || 0)

    // Update time entry to completed state
    const { error: updateTimeEntryError } = await supabase
      .from("time_entries")
      .update({
        is_active: false,
        status: "completed",
        end_time: currentTime.toISOString(),
        duration_seconds: activeSeconds,
        updated_at: currentTime.toISOString(),
      })
      .eq("id", timeEntry.id)

    if (updateTimeEntryError) {
      console.error("Error updating time entry:", updateTimeEntryError)
      return NextResponse.json({ error: "Failed to complete time tracking" }, { status: 500 })
    }

    // Update task status to "Completed"
    const { error: updateTaskError } = await supabase
      .from("tasks")
      .update({
        status: "Completed",
        time_spent: (timeEntry.time_spent || 0) + activeSeconds,
        updated_at: currentTime.toISOString(),
      })
      .eq("id", task_id)

    if (updateTaskError) {
      console.error("Error updating task status:", updateTaskError)
      return NextResponse.json({ error: "Failed to update task status" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Task completed successfully",
      duration_seconds: activeSeconds,
      hours: Math.round((activeSeconds / 3600) * 100) / 100,
    })
  } catch (error) {
    console.error("Error in complete time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
