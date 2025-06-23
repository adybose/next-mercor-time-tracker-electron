import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")
    const employeeId = searchParams.get("employee_id")
    const projectId = searchParams.get("project_id")
    const taskId = searchParams.get("task_id")
    const activeOnly = searchParams.get("active_only") === "true"

    let query = supabase.from("time_entries").select(`
        *,
        employees!inner(id, first_name, last_name, organization_id),
        projects!inner(id, name, organization_id),
        tasks!inner(id, task_name)
      `)

    if (organizationId) {
      query = query.eq("employees.organization_id", organizationId)
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    if (taskId) {
      query = query.eq("task_id", taskId)
    }

    if (activeOnly) {
      query = query.eq("is_active", true).is("end_time", null)
    }

    const { data: timeEntries, error } = await query.order("start_time", { ascending: false })

    if (error) throw error

    return NextResponse.json({ timeEntries })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { employee_id, project_id, task_id, start_time, end_time, description, ip_address, mac_address } = body

    if (!employee_id || !project_id || !start_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If no task_id provided, try to get the default task for the project
    let finalTaskId = task_id
    if (!finalTaskId) {
      const { data: defaultTask } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", project_id)
        .eq("is_active", true)
        .limit(1)
        .single()

      if (defaultTask) {
        finalTaskId = defaultTask.id
      }
    }

    // Calculate duration if end_time is provided
    let duration_seconds = null
    if (end_time) {
      const start = new Date(start_time)
      const end = new Date(end_time)
      duration_seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
    }

    const { data: timeEntry, error } = await supabase
      .from("time_entries")
      .insert({
        employee_id,
        project_id,
        task_id: finalTaskId,
        start_time,
        end_time,
        duration_seconds,
        description,
        ip_address,
        mac_address,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ timeEntry }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
