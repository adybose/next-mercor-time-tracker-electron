"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      const supabase = createClient()

      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error("Logout error:", error)
        }
      } catch (error) {
        console.error("Logout error:", error)
      } finally {
        // Always redirect to login, even if there was an error
        router.push("/auth/login?message=You have been logged out")
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Logging out...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
