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
    const { task_id, ip_address, mac_address } = body

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

    // Get the paused time entry
    const { data: timeEntry, error: timeEntryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", task_id)
      .eq("employee_id", employee.id)
      .eq("status", "paused")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (timeEntryError || !timeEntry) {
      return NextResponse.json({ error: "No paused time entry found for this task" }, { status: 404 })
    }

    // Calculate paused duration and add to total
    const currentTime = new Date()
    const pauseTime = new Date(timeEntry.last_pause_time!)
    const pausedSeconds = Math.floor((currentTime.getTime() - pauseTime.getTime()) / 1000)
    const newTotalPausedSeconds = (timeEntry.total_paused_seconds || 0) + pausedSeconds

    // Update time entry to active state
    const { error: updateError } = await supabase
      .from("time_entries")
      .update({
        is_active: true,
        status: "running",
        total_paused_seconds: newTotalPausedSeconds,
        last_pause_time: null,
        ip_address: ip_address || timeEntry.ip_address,
        mac_address: mac_address || timeEntry.mac_address,
        updated_at: currentTime.toISOString(),
      })
      .eq("id", timeEntry.id)

    if (updateError) {
      console.error("Error updating time entry:", updateError)
      return NextResponse.json({ error: "Failed to resume time tracking" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Time tracking resumed successfully",
      total_paused_seconds: newTotalPausedSeconds,
    })
  } catch (error) {
    console.error("Error in resume time tracking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
