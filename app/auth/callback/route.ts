import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Auth callback error:", error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }

      if (data.user) {
        // Handle different types of auth flows
        if (type === "invite") {
          // Employee invitation - redirect to set password
          return NextResponse.redirect(`${origin}/auth/set-password?type=invite`)
        } else if (type === "reset") {
          // Password reset - redirect to set password
          return NextResponse.redirect(`${origin}/auth/set-password?type=reset`)
        } else {
          // Regular login - check user type and redirect accordingly
          const userType = data.user.user_metadata?.user_type

          if (userType === "employee") {
            return NextResponse.redirect(`${origin}/dashboard/employee`)
          } else {
            // Check if user is organization
            const { data: orgData } = await supabase.from("organizations").select("*").eq("id", data.user.id).single()

            if (orgData) {
              return NextResponse.redirect(`${origin}/dashboard/organization`)
            } else {
              return NextResponse.redirect(`${origin}/dashboard/employee`)
            }
          }
        }
      }

      // Default redirect
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error("Callback processing error:", error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/auth/login`)
}
