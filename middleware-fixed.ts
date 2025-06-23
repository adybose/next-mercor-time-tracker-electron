import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    },
  )

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If there's an auth error, clear the session
    if (error) {
      console.log("Auth error in middleware:", error)
      // Clear auth cookies
      response.cookies.delete("sb-access-token")
      response.cookies.delete("sb-refresh-token")

      // If trying to access protected routes, redirect to login
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }
      return response
    }

    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      if (!user) {
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }

      // Verify user exists in our database
      const userType = user.user_metadata?.user_type
      let userExists = false

      if (userType === "organization") {
        const { data: orgData } = await supabase.from("organizations").select("id").eq("id", user.id).single()
        userExists = !!orgData
      } else {
        const { data: empData } = await supabase.from("employees").select("id").eq("id", user.id).single()
        userExists = !!empData
      }

      // If user doesn't exist in our database, redirect to login
      if (!userExists) {
        console.log("User not found in database, clearing session")
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL("/auth/login?error=user_not_found", request.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if (request.nextUrl.pathname.startsWith("/auth") && user) {
      // Double-check user exists in database before redirecting
      const userType = user.user_metadata?.user_type

      if (userType === "organization") {
        const { data: orgData } = await supabase.from("organizations").select("id").eq("id", user.id).single()

        if (orgData) {
          return NextResponse.redirect(new URL("/dashboard/organization", request.url))
        }
      } else {
        const { data: empData } = await supabase.from("employees").select("id").eq("id", user.id).single()

        if (empData) {
          return NextResponse.redirect(new URL("/dashboard/employee", request.url))
        }
      }

      // If user doesn't exist in database, sign them out
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL("/auth/login?error=user_not_found", request.url))
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)

    // Clear potentially corrupted auth state
    response.cookies.delete("sb-access-token")
    response.cookies.delete("sb-refresh-token")

    // If trying to access protected routes, redirect to login
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
