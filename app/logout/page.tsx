"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      const supabase = createClient()

      try {
        // Sign out from Supabase
        await supabase.auth.signOut()

        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos) : c
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
        })

        // Clear local storage
        localStorage.clear()
        sessionStorage.clear()
      } catch (error) {
        console.error("Logout error:", error)
      } finally {
        // Force redirect to login
        window.location.href = "/auth/login?message=You have been logged out"
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Logging out...</p>
      </div>
    </div>
  )
}
