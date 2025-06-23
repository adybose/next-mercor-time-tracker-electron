import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { organization_id } = await request.json()

    // First, update all running time entries with current elapsed time
    const { data: runningEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("status", "running")
      .eq("is_active", true)

    // Update running entries with current elapsed time
    for (const entry of runningEntries || []) {
      const startTime = new Date(entry.start_time).getTime()
      const currentTime = Date.now()
      const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
      const currentElapsedMs = currentTime - startTime - totalPausedMs
      const currentElapsedSeconds = Math.max(0, Math.floor(currentElapsedMs / 1000))

      // Update the current_duration_seconds for real-time tracking
      await supabase
        .from("time_entries")
        .update({
          current_duration_seconds: currentElapsedSeconds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.id)

      // Also update the task's time_spent with current running time
      await supabase
        .from("tasks")
        .update({
          time_spent: currentElapsedSeconds,
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.task_id)
    }

    // Get all employees in the organization
    const { data: employees } = await supabase
      .from("employees")
      .select(`
        id,
        first_name,
        last_name,
        email,
        is_active
      `)
      .eq("organization_id", organization_id)
      .eq("is_active", true)

    const employeeData = []
    let totalHoursToday = 0
    let totalHoursWeek = 0
    let totalHoursAllTime = 0
    let activeEmployees = 0

    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    for (const employee of employees || []) {
      // Get all time entries for this employee (including running ones)
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select(`
          *,
          tasks!inner(
            id,
            task_name,
            projects!inner(
              id,
              name
            )
          )
        `)
        .eq("employee_id", employee.id)

      // Get currently active time entry
      const { data: activeEntry } = await supabase
        .from("time_entries")
        .select(`
          *,
          tasks!inner(
            id,
            task_name,
            projects!inner(
              id,
              name
            )
          )
        `)
        .eq("employee_id", employee.id)
        .in("status", ["running", "paused"])
        .single()

      let employeeTotalAllTime = 0
      let employeeTotalToday = 0
      let employeeTotalWeek = 0
      let currentActiveSeconds = 0

      // Calculate time from all entries
      for (const entry of timeEntries || []) {
        let entryDuration = 0

        if (entry.status === "completed" && entry.duration_seconds) {
          // Use final duration for completed entries
          entryDuration = entry.duration_seconds
        } else if (entry.status === "running" && entry.is_active) {
          // Calculate current duration for running entries
          const startTime = new Date(entry.start_time).getTime()
          const currentTime = Date.now()
          const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
          const currentElapsedMs = currentTime - startTime - totalPausedMs
          entryDuration = Math.max(0, Math.floor(currentElapsedMs / 1000))
          currentActiveSeconds = entryDuration
        } else if (entry.status === "paused") {
          // Use current duration for paused entries
          entryDuration = entry.current_duration_seconds || 0
        }

        employeeTotalAllTime += entryDuration

        // Check if entry is from today
        const entryDate = new Date(entry.start_time)
        if (entryDate >= startOfToday) {
          employeeTotalToday += entryDuration
        }

        // Check if entry is from this week
        if (entryDate >= startOfWeek) {
          employeeTotalWeek += entryDuration
        }
      }

      // Determine employee status
      const isActive = activeEntry && (activeEntry.status === "running" || activeEntry.status === "paused")
      if (isActive) activeEmployees++

      employeeData.push({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        status: isActive ? "Active" : "Inactive",
        currentTask: activeEntry?.tasks?.task_name || null,
        currentProject: activeEntry?.tasks?.projects?.name || null,
        totalAllTime: employeeTotalAllTime,
        totalLastWeek: employeeTotalWeek,
        totalToday: employeeTotalToday,
        currentActiveSeconds,
        activeEntries: timeEntries?.length || 0,
      })

      totalHoursAllTime += employeeTotalAllTime
      totalHoursToday += employeeTotalToday
      totalHoursWeek += employeeTotalWeek
    }

    const summary = {
      totalEmployees: employees?.length || 0,
      activeEmployees,
      totalHoursToday,
      totalHoursWeek,
      totalHoursAllTime,
    }

    return NextResponse.json({
      success: true,
      employees: employeeData,
      summary,
    })
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
