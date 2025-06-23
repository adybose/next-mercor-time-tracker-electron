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

    // Calculate current time for active entries
    const enrichedEntries = timeEntries?.map((entry) => {
      let currentDurationSeconds = entry.duration_seconds || 0
      let displayStatus = entry.status

      if (entry.is_active && (entry.status === "running" || entry.status === "paused")) {
        const startTime = new Date(entry.start_time).getTime()
        const currentTime = Date.now()
        const totalPausedMs = (entry.total_paused_seconds || 0) * 1000

        if (entry.status === "running") {
          // Currently running - calculate live time
          currentDurationSeconds = Math.floor((currentTime - startTime - totalPausedMs) / 1000)
          displayStatus = "running"
        } else if (entry.status === "paused" && entry.pause_start_time) {
          // Currently paused - calculate time up to pause
          const pauseTime = new Date(entry.pause_start_time).getTime()
          currentDurationSeconds = Math.floor((pauseTime - startTime - totalPausedMs) / 1000)
          displayStatus = "paused"
        }
      }

      return {
        ...entry,
        current_duration_seconds: Math.max(0, currentDurationSeconds),
        display_status: displayStatus,
        is_currently_active: entry.is_active && entry.status === "running",
        is_currently_paused: entry.is_active && entry.status === "paused",
      }
    })

    // Determine employee status
    const hasRunningTasks = enrichedEntries?.some((entry) => entry.is_currently_active) || false
    const hasPausedTasks = enrichedEntries?.some((entry) => entry.is_currently_paused) || false

    let employeeStatus = "offline"
    if (hasRunningTasks) {
      employeeStatus = "active"
    } else if (hasPausedTasks) {
      employeeStatus = "paused"
    } else if (employee.is_active) {
      employeeStatus = "online"
    }

    return NextResponse.json({
      time_entries: enrichedEntries,
      employee_status: employeeStatus,
      has_running_tasks: hasRunningTasks,
      has_paused_tasks: hasPausedTasks,
    })
  } catch (error) {
    console.error("Error fetching time tracking status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
