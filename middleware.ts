import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip middleware for debug pages and static assets
  if (
    request.nextUrl.pathname.startsWith("/debug") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api")
  ) {
    return response
  }

  try {
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

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.log("Session error in middleware:", sessionError.message)
    }

    const user = session?.user

    // Handle logout requests - allow access to logout even when authenticated
    if (request.nextUrl.pathname === "/auth/logout") {
      return response
    }

    // Allow access to login page with ?force=true parameter
    if (request.nextUrl.pathname === "/auth/login" && request.nextUrl.searchParams.get("force") === "true") {
      return response
    }

    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      if (!user) {
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }
      return response
    }

    // Redirect authenticated users away from auth pages (except logout and forced login)
    if (request.nextUrl.pathname.startsWith("/auth") && user) {
      // Don't redirect if it's logout or forced login
      if (request.nextUrl.pathname === "/auth/logout" || request.nextUrl.searchParams.get("force") === "true") {
        return response
      }

      // Check user type and redirect appropriately
      try {
        const { data: userTypeData } = await supabase.rpc("get_user_type", {
          user_id: user.id,
        })

        if (userTypeData && userTypeData.length > 0) {
          const userType = userTypeData[0]?.user_type
          if (userType === "organization") {
            return NextResponse.redirect(new URL("/dashboard/organization", request.url))
          } else {
            return NextResponse.redirect(new URL("/dashboard/employee", request.url))
          }
        }
      } catch (error) {
        console.error("Error checking user type in middleware:", error)
      }

      // Default redirect to employee dashboard
      return NextResponse.redirect(new URL("/dashboard/employee", request.url))
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)

    // If accessing dashboard, redirect to login
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/auth/login?error=middleware_error", request.url))
    }

    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
