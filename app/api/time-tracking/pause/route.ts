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
      console.error("Auth error in pause:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { task_id } = body

    if (!task_id) {
      console.error("Missing task_id in pause request")
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    console.log("Pause request for task:", task_id, "by user:", user.email)

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

    console.log("Employee found:", employee.id)

    // Find the active time entry for this task
    const { data: activeEntries, error: entryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)

    if (entryError) {
      console.error("Error fetching time entries:", entryError)
      return NextResponse.json({ error: "Database error fetching time entries" }, { status: 500 })
    }

    if (!activeEntries || activeEntries.length === 0) {
      console.error("No active time entries found for task:", task_id)
      return NextResponse.json({ error: "No active time entry found for this task" }, { status: 404 })
    }

    const activeEntry = activeEntries[0]
    console.log("Active entry found:", activeEntry.id, "status:", activeEntry.status)

    // Only pause if currently running
    if (activeEntry.status !== "running") {
      console.error("Task is not running, current status:", activeEntry.status)
      return NextResponse.json(
        { error: `Task is not currently running (status: ${activeEntry.status})` },
        { status: 400 },
      )
    }

    // Calculate current duration up to this pause point
    const startTime = new Date(activeEntry.start_time).getTime()
    const pauseTime = Date.now()
    const totalPausedMs = (activeEntry.total_paused_seconds || 0) * 1000
    const currentDurationMs = pauseTime - startTime - totalPausedMs
    const currentDurationSeconds = Math.max(0, Math.floor(currentDurationMs / 1000))

    console.log("Pause calculation:", {
      start_time: activeEntry.start_time,
      pause_time: new Date().toISOString(),
      total_paused_before: activeEntry.total_paused_seconds || 0,
      current_duration: currentDurationSeconds,
    })

    // Update the time entry to paused status
    const updateData = {
      status: "paused",
      pause_start_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Only add current_duration_seconds if the column exists
    try {
      const { data: updatedEntry, error: updateError } = await supabase
        .from("time_entries")
        .update({
          ...updateData,
          current_duration_seconds: currentDurationSeconds,
        })
        .eq("id", activeEntry.id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating with current_duration_seconds:", updateError)

        // Try without current_duration_seconds column
        const { data: updatedEntry2, error: updateError2 } = await supabase
          .from("time_entries")
          .update(updateData)
          .eq("id", activeEntry.id)
          .select()
          .single()

        if (updateError2) {
          console.error("Error updating time entry (fallback):", updateError2)
          return NextResponse.json({ error: "Failed to pause time tracking" }, { status: 500 })
        }

        console.log("Successfully paused task (fallback):", updatedEntry2)
        return NextResponse.json({
          message: "Time tracking paused successfully",
          current_duration_seconds: currentDurationSeconds,
          entry_id: activeEntry.id,
          status: "paused",
        })
      }

      console.log("Successfully paused task:", updatedEntry)
      return NextResponse.json({
        message: "Time tracking paused successfully",
        current_duration_seconds: currentDurationSeconds,
        entry_id: activeEntry.id,
        status: "paused",
        updated_entry: updatedEntry,
      })
    } catch (dbError) {
      console.error("Database error during pause:", dbError)
      return NextResponse.json({ error: "Database error during pause operation" }, { status: 500 })
    }
  } catch (error) {
    console.error("Unexpected error pausing time tracking:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
