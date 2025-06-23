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
      console.error("Auth error in resume:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { task_id, ip_address, mac_address } = body

    if (!task_id) {
      console.error("Missing task_id in resume request")
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log("Resume request for task:", task_id, "by user:", user.email)

    // Get employee info
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .single()

    if (employeeError || !employee) {
      console.error("Employee not found:", employeeError)
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Find the paused time entry for this task
    const { data: pausedEntries, error: entryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .eq("status", "paused")

    if (entryError) {
      console.error("Error fetching paused entries:", entryError)
      return NextResponse.json({ error: "Database error fetching time entries" }, { status: 500 })
    }

    if (!pausedEntries || pausedEntries.length === 0) {
      console.error("No paused time entry found for task:", task_id)
      return NextResponse.json({ error: "No paused time entry found for this task" }, { status: 404 })
    }

    const pausedEntry = pausedEntries[0]
    console.log("Paused entry found:", pausedEntry.id)

    // Calculate pause duration
    let totalPausedSeconds = pausedEntry.total_paused_seconds || 0

    if (pausedEntry.pause_start_time) {
      const pauseStartTime = new Date(pausedEntry.pause_start_time).getTime()
      const resumeTime = Date.now()
      const pauseDurationMs = resumeTime - pauseStartTime
      const pauseDurationSeconds = Math.floor(pauseDurationMs / 1000)
      totalPausedSeconds += pauseDurationSeconds

      console.log("Pause duration calculation:", {
        pause_start: pausedEntry.pause_start_time,
        resume_time: new Date().toISOString(),
        pause_duration: pauseDurationSeconds,
        total_paused: totalPausedSeconds,
      })
    }

    // Update the time entry to running status
    const updateData = {
      status: "running",
      pause_start_time: null,
      total_paused_seconds: totalPausedSeconds,
      updated_at: new Date().toISOString(),
    }

    try {
      const { data: updatedEntry, error: updateError } = await supabase
        .from("time_entries")
        .update(updateData)
        .eq("id", pausedEntry.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating time entry for resume:", updateError)
        return NextResponse.json({ error: "Failed to resume time tracking" }, { status: 500 })
      }

      console.log("Successfully resumed task:", updatedEntry)

      return NextResponse.json({
        message: "Time tracking resumed successfully",
        total_paused_seconds: totalPausedSeconds,
        entry_id: pausedEntry.id,
        status: "running",
        updated_entry: updatedEntry,
      })
    } catch (dbError) {
      console.error("Database error during resume:", dbError)
      return NextResponse.json({ error: "Database error during resume operation" }, { status: 500 })
    }
  } catch (error) {
    console.error("Unexpected error resuming time tracking:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
