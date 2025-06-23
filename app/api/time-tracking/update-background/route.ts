import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { employee_id, organization_id } = await request.json()

    // Get all running time entries (either for specific employee or entire organization)
    let query = supabase.from("time_entries").select("*").eq("status", "running").eq("is_active", true)

    if (employee_id) {
      query = query.eq("employee_id", employee_id)
    } else if (organization_id) {
      // Get all employees in organization first
      const { data: employees } = await supabase.from("employees").select("id").eq("organization_id", organization_id)

      const employeeIds = employees?.map((emp) => emp.id) || []
      if (employeeIds.length > 0) {
        query = query.in("employee_id", employeeIds)
      }
    }

    const { data: runningEntries, error: entriesError } = await query

    if (entriesError) {
      console.error("Error fetching running entries:", entriesError)
      return NextResponse.json({ error: "Failed to fetch running entries" }, { status: 500 })
    }

    const updates = []

    for (const entry of runningEntries || []) {
      // Calculate current duration for running entries
      const startTime = new Date(entry.start_time).getTime()
      const currentTime = Date.now()
      const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
      const currentElapsedMs = currentTime - startTime - totalPausedMs
      const currentDurationSeconds = Math.max(0, Math.floor(currentElapsedMs / 1000))

      // Update the time entry with current duration
      const { error: entryUpdateError } = await supabase
        .from("time_entries")
        .update({
          current_duration_seconds: currentDurationSeconds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id)

      if (entryUpdateError) {
        console.error("Error updating time entry:", entryUpdateError)
        continue
      }

      // Update the task's time_spent with current running time
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
          entry_id: entry.id,
          task_id: entry.task_id,
          duration_seconds: currentDurationSeconds,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} running time entries`,
      updates,
    })
  } catch (error) {
    console.error("Background update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
