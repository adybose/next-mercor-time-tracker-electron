import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("project_id")
    const employeeId = searchParams.get("employee_id")

    let query = supabase.from("tasks").select(`
        *,
        employee:employees(first_name, last_name, email),
        projects(id, name)
      `)

    if (projectId) {
      query = query.eq("project_id", projectId)
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    const { data: tasks, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ tasks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { project_id, task_name, task_description, employee_id } = body

    if (!project_id || !task_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Determine status based on employee assignment
    const status = employee_id ? "Assigned" : "Open"

    const insertData: any = {
      project_id,
      task_name,
      task_description: task_description || null,
      employee_id: employee_id || null,
      status,
      time_spent: 0,
      is_active: true,
    }

    console.log("Creating task with data:", insertData)

    const { data: task, error } = await supabase
      .from("tasks")
      .insert(insertData)
      .select(`
        *,
        employee:employees(first_name, last_name, email)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ task }, { status: 201 })
  } catch (error: any) {
    console.error("Task creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { id, employee_id, status, task_name, task_description } = body

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Get current task to check status and employee
    const { data: existingTask } = await supabase
      .from("tasks")
      .select("status, employee_id, task_name")
      .eq("id", id)
      .single()

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Completed tasks cannot be modified
    if (existingTask.status === "Completed") {
      return NextResponse.json({ error: "Completed tasks cannot be modified" }, { status: 400 })
    }

    const updateData: any = {}

    // Update task name if provided
    if (task_name !== undefined) {
      updateData.task_name = task_name
    }

    // Update description if provided
    if (task_description !== undefined) {
      updateData.task_description = task_description
    }

    // Handle employee assignment/reassignment/unassignment
    if (employee_id !== undefined) {
      updateData.employee_id = employee_id

      // Determine status based on employee assignment
      if (!employee_id) {
        // Unassigning employee
        updateData.status = "Open"
        console.log("Employee unassigned, setting status to Open")
      } else if (employee_id !== existingTask.employee_id) {
        // Assigning or reassigning employee
        updateData.status = "Assigned"
        console.log("Employee assigned/reassigned, setting status to Assigned")
      }
    }

    // Handle status change (only if employee assignment is not changing)
    if (status !== undefined && employee_id === existingTask.employee_id) {
      updateData.status = status

      // If changing status to "Open", unassign employee
      if (status === "Open") {
        updateData.employee_id = null
        console.log("Status changed to Open, unassigning employee")
      }

      console.log("Status changed to:", status)
    }

    console.log("Updating task with data:", updateData)

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        employee:employees(first_name, last_name, email)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ task })
  } catch (error: any) {
    console.error("Task update error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
