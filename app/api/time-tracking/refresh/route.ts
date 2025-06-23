import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { organization_id } = await request.json()

    // Get all employees in the organization
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email")
      .eq("organization_id", organization_id)

    if (empError) {
      return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 })
    }

    const employeeData = []

    for (const employee of employees || []) {
      // Get active time entries for this employee
      const { data: activeEntries } = await supabase
        .from("time_entries")
        .select("*, tasks(task_name, projects(name))")
        .eq("employee_id", employee.id)
        .in("status", ["running", "paused"])

      // Get completed time entries for totals
      const { data: completedEntries } = await supabase
        .from("time_entries")
        .select("duration_seconds, created_at")
        .eq("employee_id", employee.id)
        .eq("status", "completed")
        .not("duration_seconds", "is", null)

      // Calculate time totals
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      let totalAllTime = 0
      let totalLastWeek = 0
      let totalToday = 0

      // Add completed entries
      completedEntries?.forEach((entry) => {
        const entryDate = new Date(entry.created_at)
        const duration = entry.duration_seconds || 0

        totalAllTime += duration

        if (entryDate >= weekAgo) {
          totalLastWeek += duration
        }

        if (entryDate >= today) {
          totalToday += duration
        }
      })

      // Add current running/paused time
      let currentActiveSeconds = 0
      let isCurrentlyActive = false
      let currentTask = null

      activeEntries?.forEach((entry) => {
        if (entry.status === "running" && entry.is_active) {
          const startTime = new Date(entry.start_time).getTime()
          const currentTime = Date.now()
          const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
          const currentDurationMs = currentTime - startTime - totalPausedMs
          const currentDurationSeconds = Math.max(0, Math.floor(currentDurationMs / 1000))

          currentActiveSeconds += currentDurationSeconds
          isCurrentlyActive = true
          currentTask = entry.tasks
        }
      })

      // Add current active time to today's total
      totalToday += currentActiveSeconds

      employeeData.push({
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        status: isCurrentlyActive ? "Active" : "Inactive",
        currentTask: currentTask?.task_name || null,
        currentProject: currentTask?.projects?.name || null,
        totalAllTime,
        totalLastWeek,
        totalToday,
        currentActiveSeconds,
        activeEntries: activeEntries?.length || 0,
      })
    }

    return NextResponse.json({
      success: true,
      employees: employeeData,
      summary: {
        totalEmployees: employees?.length || 0,
        activeEmployees: employeeData.filter((emp) => emp.status === "Active").length,
        totalHoursToday: employeeData.reduce((sum, emp) => sum + emp.totalToday, 0),
        totalHoursWeek: employeeData.reduce((sum, emp) => sum + emp.totalLastWeek, 0),
        totalHoursAllTime: employeeData.reduce((sum, emp) => sum + emp.totalAllTime, 0),
      },
    })
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
