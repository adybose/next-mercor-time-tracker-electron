import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Get all employees for the organization
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)

    if (employeesError) throw employeesError

    // Get all projects for the organization
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)

    if (projectsError) throw projectsError

    // Get tasks to understand employee-project relationships
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        project_id,
        employee_id,
        task_name,
        projects!inner(id, name, organization_id)
      `)
      .eq("projects.organization_id", organizationId)
      .not("employee_id", "is", null)

    if (tasksError) throw tasksError

    // Get time entries with detailed information
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from("time_entries")
      .select(`
        *,
        employees!inner(id, first_name, last_name, email, organization_id),
        projects!inner(id, name, organization_id),
        tasks!inner(id, project_id, employee_id, task_name)
      `)
      .eq("employees.organization_id", organizationId)

    if (timeEntriesError) throw timeEntriesError

    // Get currently active time entries
    const { data: activeEntries, error: activeError } = await supabase
      .from("time_entries")
      .select(`
        *,
        employees!inner(id, first_name, last_name, email, organization_id),
        tasks!inner(id, task_name)
      `)
      .eq("employees.organization_id", organizationId)
      .in("status", ["running", "paused"])
      .eq("is_active", true)

    if (activeError) throw activeError

    // Create employee-project relationships from tasks
    const employeeProjectMap = new Map()
    tasks.forEach((task: any) => {
      if (task.employee_id && task.project_id) {
        const key = `${task.employee_id}-${task.project_id}`
        if (!employeeProjectMap.has(key)) {
          employeeProjectMap.set(key, {
            employeeId: task.employee_id,
            projectId: task.project_id,
            projectName: task.projects.name,
            currentTask: null,
          })
        }
      }
    })

    // Calculate time data for each employee-project combination
    const employeeTimeMap = new Map()

    timeEntries.forEach((entry: any) => {
      const employeeId = entry.employee_id
      const projectId = entry.project_id
      const key = `${employeeId}-${projectId}`

      let durationHours = 0

      // Calculate duration based on entry status
      if (entry.status === "completed" && entry.duration_seconds) {
        durationHours = entry.duration_seconds / 3600
      } else if (entry.is_active && (entry.status === "running" || entry.status === "paused")) {
        // Calculate current duration for active entries
        const startTime = new Date(entry.start_time).getTime()
        const currentTime = Date.now()
        const totalPausedMs = (entry.total_paused_seconds || 0) * 1000

        let currentDurationMs = 0
        if (entry.status === "running") {
          currentDurationMs = currentTime - startTime - totalPausedMs
        } else if (entry.status === "paused" && entry.pause_start_time) {
          const pauseTime = new Date(entry.pause_start_time).getTime()
          currentDurationMs = pauseTime - startTime - totalPausedMs
        }

        durationHours = Math.max(0, currentDurationMs) / (1000 * 3600)
      }

      const entryDate = new Date(entry.start_time)
      const today = new Date()
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      const isToday = entryDate.toDateString() === today.toDateString()
      const isLastWeek = entryDate >= lastWeek && entryDate <= today

      if (!employeeTimeMap.has(key)) {
        employeeTimeMap.set(key, {
          employee: entry.employees,
          project: entry.projects,
          hoursAllTime: 0,
          hoursLastWeek: 0,
          hoursToday: 0,
          totalEntries: 0,
          currentTask: null,
          status: "Inactive",
        })
      }

      const data = employeeTimeMap.get(key)
      data.hoursAllTime += durationHours
      data.totalEntries += 1

      if (isLastWeek) {
        data.hoursLastWeek += durationHours
      }

      if (isToday) {
        data.hoursToday += durationHours
      }
    })

    // Update with current task information and status
    activeEntries?.forEach((entry: any) => {
      const employeeId = entry.employee_id
      const projectId = entry.project_id
      const key = `${employeeId}-${projectId}`

      if (employeeTimeMap.has(key)) {
        const data = employeeTimeMap.get(key)
        data.currentTask = entry.tasks.task_name

        if (entry.status === "running") {
          data.status = "Active"
        } else if (entry.status === "paused") {
          data.status = "Paused"
        }
      }
    })

    // Include employees who have task assignments but no time entries yet
    employeeProjectMap.forEach((relationship, key) => {
      if (!employeeTimeMap.has(key)) {
        const employee = employees.find((emp) => emp.id === relationship.employeeId)
        const project = projects.find((proj) => proj.id === relationship.projectId)

        if (employee && project) {
          employeeTimeMap.set(key, {
            employee,
            project,
            hoursAllTime: 0,
            hoursLastWeek: 0,
            hoursToday: 0,
            totalEntries: 0,
            currentTask: null,
            status: "Inactive",
          })
        }
      }
    })

    const employeeTimeData = Array.from(employeeTimeMap.values())

    // Create filtered lists for smart filtering
    const employeeProjectRelationships = Array.from(employeeProjectMap.values())

    return NextResponse.json({
      employeeTimeData,
      employees,
      projects,
      employeeProjectRelationships,
    })
  } catch (error: any) {
    console.error("Error fetching time tracking summary:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
