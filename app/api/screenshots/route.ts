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
    const employeeId = searchParams.get("employee_id")
    const timeEntryId = searchParams.get("time_entry_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    // Check if user is an organization admin
    const { data: orgUser } = await supabase.from("organizations").select("*").eq("email", user.email).single()

    if (!orgUser) {
      return NextResponse.json({ error: "Only organization admins can view screenshots" }, { status: 403 })
    }

    let query = supabase
      .from("screenshots")
      .select(`
        *,
        employees (
          first_name,
          last_name,
          email
        )
      `)
      .eq("employees.organization_id", orgUser.id)

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (timeEntryId) {
      query = query.eq("time_entry_id", timeEntryId)
    }

    if (startDate) {
      query = query.gte("taken_at", startDate)
    }

    if (endDate) {
      query = query.lte("taken_at", endDate)
    }

    const { data: screenshots, error } = await query.order("taken_at", { ascending: false }).limit(100)

    if (error) {
      console.error("Error fetching screenshots:", error)
      return NextResponse.json({ error: "Failed to fetch screenshots" }, { status: 500 })
    }

    return NextResponse.json({ screenshots })
  } catch (error) {
    console.error("Error in screenshots GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const { time_entry_id, file_url, has_permissions = true } = body

    if (!time_entry_id || !file_url) {
      return NextResponse.json({ error: "Time entry ID and file URL are required" }, { status: 400 })
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

    // Verify the time entry belongs to this employee
    const { data: timeEntry, error: timeEntryError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("id", time_entry_id)
      .eq("employee_id", employee.id)
      .single()

    if (timeEntryError || !timeEntry) {
      return NextResponse.json({ error: "Time entry not found or not accessible" }, { status: 404 })
    }

    // Create screenshot record
    const { data: screenshot, error: screenshotError } = await supabase
      .from("screenshots")
      .insert({
        time_entry_id,
        employee_id: employee.id,
        file_url,
        taken_at: new Date().toISOString(),
        has_permissions,
      })
      .select()
      .single()

    if (screenshotError) {
      console.error("Error creating screenshot record:", screenshotError)
      return NextResponse.json({ error: "Failed to save screenshot" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Screenshot uploaded successfully",
      screenshot,
    })
  } catch (error) {
    console.error("Error in screenshots POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
