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
      .single()

    if (entryError || !activeEntry) {
      console.error("No active time entry found:", entryError)
      return NextResponse.json({ error: "No active time entry found for this task" }, { status: 404 })
    }

    // Only pause if currently running
    if (activeEntry.status !== "running") {
      return NextResponse.json({ error: "Task is not currently running" }, { status: 400 })
    }

    // Calculate current duration up to this pause point
    const startTime = new Date(activeEntry.start_time).getTime()
    const pauseTime = Date.now()
    const totalPausedMs = (activeEntry.total_paused_seconds || 0) * 1000
    const currentDurationMs = pauseTime - startTime - totalPausedMs
    const currentDurationSeconds = Math.max(0, Math.floor(currentDurationMs / 1000))

    console.log("Pausing task:", {
      task_id,
      entry_id: activeEntry.id,
      start_time: activeEntry.start_time,
      current_duration: currentDurationSeconds,
      total_paused_before: activeEntry.total_paused_seconds || 0,
    })

    // Update the time entry to paused status
    const { data: updatedEntry, error: updateError } = await supabase
      .from("time_entries")
      .update({
        status: "paused",
        pause_start_time: new Date().toISOString(),
        current_duration_seconds: currentDurationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", activeEntry.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating time entry:", updateError)
      return NextResponse.json({ error: "Failed to pause time tracking" }, { status: 500 })
    }

    console.log("Successfully paused task:", updatedEntry)

    return NextResponse.json({
      message: "Time tracking paused successfully",
      current_duration_seconds: currentDurationSeconds,
      entry_id: activeEntry.id,
      status: "paused",
      updated_entry: updatedEntry,
    })
  } catch (error) {
    console.error("Error pausing time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
