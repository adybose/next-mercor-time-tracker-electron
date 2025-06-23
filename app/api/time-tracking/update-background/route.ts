import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { employee_id } = await request.json()

    // Get all active time entries (running or paused)
    const { data: activeEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select("*")
      .in("status", ["running", "paused"])
      .eq("employee_id", employee_id)

    if (entriesError) {
      console.error("Error fetching active entries:", entriesError)
      return NextResponse.json({ error: "Failed to fetch active entries" }, { status: 500 })
    }

    const updates = []

    for (const entry of activeEntries || []) {
      if (entry.status === "running" && entry.is_active) {
        // Calculate current duration for running entries
        const startTime = new Date(entry.start_time).getTime()
        const currentTime = Date.now()
        const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
        const currentDurationMs = currentTime - startTime - totalPausedMs
        const currentDurationSeconds = Math.max(0, Math.floor(currentDurationMs / 1000))

        // Update the time_spent in tasks table
        const { error: taskUpdateError } = await supabase
          .from("tasks")
          .update({
            time_spent: currentDurationSeconds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.task_id)

        if (taskUpdateError) {
          console.error("Error updating task time:", taskUpdateError)
        } else {
          updates.push({
            task_id: entry.task_id,
            duration_seconds: currentDurationSeconds,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} active time entries`,
      updates,
    })
  } catch (error) {
    console.error("Background update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
