import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Skip middleware for static files and API routes
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return response
  }

  // Always allow access to logout page
  if (request.nextUrl.pathname === "/logout") {
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

    // Allow forced access to login page
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

    // Only redirect authenticated users away from auth pages if not forced
    if (request.nextUrl.pathname.startsWith("/auth") && user && request.nextUrl.searchParams.get("force") !== "true") {
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
