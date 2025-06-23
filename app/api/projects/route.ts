import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ projects })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const { organization_id, name, description } = body

    if (!organization_id || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        organization_id,
        name,
        description,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    // Create a default task for the project
    const { error: taskError } = await supabase.from("tasks").insert({
      project_id: project.id,
      name: "Default Task",
      description: "Default task for " + name,
      is_active: true,
    })

    if (taskError) console.error("Error creating default task:", taskError)

    return NextResponse.json({ project }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
