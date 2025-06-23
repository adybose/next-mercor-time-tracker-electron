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

    const { task_id } = await request.json()

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

    // Find the active time entry for this task
    const { data: activeEntry, error: entryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .eq("status", "running")
      .single()

    if (entryError || !activeEntry) {
      return NextResponse.json({ error: "No active time entry found for this task" }, { status: 404 })
    }

    // Calculate current duration
    const startTime = new Date(activeEntry.start_time).getTime()
    const pauseTime = Date.now()
    const totalPausedMs = (activeEntry.total_paused_seconds || 0) * 1000
    const currentDurationMs = pauseTime - startTime - totalPausedMs
    const currentDurationSeconds = Math.max(0, Math.floor(currentDurationMs / 1000))

    // Update the time entry to paused status
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        status: "paused",
        pause_start_time: new Date().toISOString(),
        current_duration_seconds: currentDurationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeEntry.id)

    if (updateError) {
      console.error("Error updating time entry:", updateError)
      return NextResponse.json({ error: "Failed to pause time tracking" }, { status: 500 })
    }

    // Update task status to remain "In Progress" (don't change it)
    const { error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)

    if (taskUpdateError) {
      console.error("Error updating task:", taskUpdateError)
    }

    return NextResponse.json({
      message: "Time tracking paused successfully",
      current_duration_seconds: currentDurationSeconds,
      entry_id: activeEntry.id,
    })
  } catch (error) {
    console.error("Error pausing time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
