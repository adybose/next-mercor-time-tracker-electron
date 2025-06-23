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

    const body = await request.json()
    const { task_id, description, ip_address, mac_address } = body

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

    // Verify the task belongs to this employee
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .eq("employee_id", employee.id)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found or not assigned to you" }, { status: 404 })
    }

    // Check if there's already an active time entry for this task
    const { data: existingEntry } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("is_active", true)
      .single()

    if (existingEntry) {
      return NextResponse.json({ error: "Task is already active" }, { status: 400 })
    }

    // Create new time entry
    const { data: timeEntry, error: timeEntryError } = await supabase
      .from("time_entries")
      .insert({
        task_id,
        project_id: task.project_id,
        employee_id: employee.id,
        start_time: new Date().toISOString(),
        description: description || "Task started",
        ip_address,
        mac_address,
        is_active: true,
        total_paused_seconds: 0,
      })
      .select()
      .single()

    if (timeEntryError) {
      console.error("Error creating time entry:", timeEntryError)
      return NextResponse.json({ error: "Failed to start time tracking" }, { status: 500 })
    }

    // Update task status to "In Progress"
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: "In Progress", updated_at: new Date().toISOString() })
      .eq("id", task_id)

    if (updateError) {
      console.error("Error updating task status:", updateError)
    }

    return NextResponse.json({
      message: "Time tracking started successfully",
      time_entry: timeEntry,
    })
  } catch (error) {
    console.error("Error in start time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
