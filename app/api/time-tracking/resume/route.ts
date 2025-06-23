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

    const { task_id, ip_address, mac_address } = await request.json()

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

    // Find the paused time entry for this task
    const { data: pausedEntry, error: entryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .eq("status", "paused")
      .single()

    if (entryError || !pausedEntry) {
      return NextResponse.json({ error: "No paused time entry found for this task" }, { status: 404 })
    }

    // Calculate total paused time
    const pauseStartTime = new Date(pausedEntry.pause_start_time).getTime()
    const resumeTime = Date.now()
    const pauseDurationMs = resumeTime - pauseStartTime
    const pauseDurationSeconds = Math.floor(pauseDurationMs / 1000)
    const newTotalPausedSeconds = (pausedEntry.total_paused_seconds || 0) + pauseDurationSeconds

    // Resume the time entry
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        status: "running",
        pause_start_time: null,
        total_paused_seconds: newTotalPausedSeconds,
        resume_time: new Date().toISOString(),
        ip_address: ip_address || pausedEntry.ip_address,
        mac_address: mac_address || pausedEntry.mac_address,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pausedEntry.id)

    if (updateError) {
      console.error("Error updating time entry:", updateError)
      return NextResponse.json({ error: "Failed to resume time tracking" }, { status: 500 })
    }

    // Update task status to "In Progress"
    const { error: taskUpdateError } = await supabase
      .from("tasks")
      .update({
        status: "In Progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task_id)

    if (taskUpdateError) {
      console.error("Error updating task:", taskUpdateError)
    }

    return NextResponse.json({
      message: "Time tracking resumed successfully",
      entry_id: pausedEntry.id,
      total_paused_seconds: newTotalPausedSeconds,
    })
  } catch (error) {
    console.error("Error resuming time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
