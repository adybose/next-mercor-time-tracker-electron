import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data: employee, error } = await supabase.from("employees").select("*").eq("id", id).single()

    if (error) throw error

    return NextResponse.json({ employee })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params
    const body = await request.json()

    const { data: employee, error } = await supabase.from("employees").update(body).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json({ employee })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    // Soft delete by setting is_active to false
    const { data: employee, error } = await supabase
      .from("employees")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ employee })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
