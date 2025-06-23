import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { employee_id, organization_id } = await request.json()

    if (employee_id) {
      // Employee-specific refresh
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employee_id)
        .single()

      if (empError) throw empError

      // Get all tasks for this employee
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(id, name),
          time_entries(*)
        `)
        .eq("employee_id", employee_id)
        .eq("is_active", true)

      if (tasksError) throw tasksError

      // Get active time entries
      const { data: activeEntries, error: activeError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee_id)
        .in("status", ["running", "paused"])
        .eq("is_active", true)

      if (activeError) throw activeError

      // Calculate total time including current active time
      let totalSeconds = 0

      // Add completed time from all tasks
      tasks?.forEach((task) => {
        const taskEntries = task.time_entries || []
        const taskTotal = taskEntries.reduce((sum: number, entry: any) => {
          if (entry.status === "completed" && entry.duration_seconds) {
            return sum + entry.duration_seconds
          }
          return sum
        }, 0)
        totalSeconds += taskTotal
      })

      // Add current active/paused time
      activeEntries?.forEach((entry) => {
        const startTime = new Date(entry.start_time).getTime()
        const currentTime = Date.now()
        const totalPausedMs = (entry.total_paused_seconds || 0) * 1000

        let currentDurationSeconds = 0
        if (entry.status === "running") {
          currentDurationSeconds = Math.floor((currentTime - startTime - totalPausedMs) / 1000)
        } else if (entry.status === "paused" && entry.pause_start_time) {
          const pauseTime = new Date(entry.pause_start_time).getTime()
          currentDurationSeconds = Math.floor((pauseTime - startTime - totalPausedMs) / 1000)
        }

        totalSeconds += Math.max(0, currentDurationSeconds)
      })

      return NextResponse.json({
        employee: {
          ...employee,
          totalHoursLogged: totalSeconds,
          hasRunningTasks: activeEntries?.some((e) => e.status === "running") || false,
          hasPausedTasks: activeEntries?.some((e) => e.status === "paused") || false,
        },
        tasks: tasks?.map((task) => {
          const activeEntry = activeEntries?.find((e) => e.task_id === task.id)
          return {
            ...task,
            currentTimeEntry: activeEntry || null,
          }
        }),
      })
    } else if (organization_id) {
      // Organization-wide refresh
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/time-tracking/summary?organization_id=${organization_id}`,
      )
      const summaryData = await response.json()

      // Calculate summary statistics
      const employees = summaryData.employeeTimeData || []
      const totalHoursToday = employees.reduce((sum: number, emp: any) => sum + (emp.hoursToday || 0), 0) * 3600
      const totalHoursWeek = employees.reduce((sum: number, emp: any) => sum + (emp.hoursLastWeek || 0), 0) * 3600
      const totalHoursAllTime = employees.reduce((sum: number, emp: any) => sum + (emp.hoursAllTime || 0), 0) * 3600
      const activeEmployees = employees.filter((emp: any) => emp.status === "Active" || emp.status === "Paused").length

      return NextResponse.json({
        employees: employees.map((emp: any) => ({
          id: emp.employee.id,
          name: `${emp.employee.first_name} ${emp.employee.last_name}`,
          email: emp.employee.email,
          status: emp.status,
          currentTask: emp.currentTask,
          currentProject: emp.project.name,
          totalAllTime: emp.hoursAllTime * 3600,
          totalLastWeek: emp.hoursLastWeek * 3600,
          totalToday: emp.hoursToday * 3600,
          activeEntries: emp.totalEntries,
        })),
        summary: {
          totalEmployees: employees.length,
          activeEmployees,
          totalHoursToday,
          totalHoursWeek,
          totalHoursAllTime,
        },
      })
    }

    return NextResponse.json({ error: "Missing employee_id or organization_id" }, { status: 400 })
  } catch (error) {
    console.error("Error refreshing time tracking data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
