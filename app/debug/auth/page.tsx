"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debugAuth() {
      const supabase = createClient()

      try {
        // Check environment variables
        const envCheck = {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          actualUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
          actualKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + "...",
        }

        // Check session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        // Check user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        // Check cookies
        const cookies = document.cookie.split(";").reduce((acc: any, cookie) => {
          const [key, value] = cookie.trim().split("=")
          if (key.includes("supabase")) {
            acc[key] = value?.substring(0, 50) + "..."
          }
          return acc
        }, {})

        setDebugInfo({
          environment: envCheck,
          session: {
            exists: !!sessionData.session,
            error: sessionError?.message,
            accessToken: sessionData.session?.access_token?.substring(0, 50) + "...",
            refreshToken: sessionData.session?.refresh_token?.substring(0, 50) + "...",
            expiresAt: sessionData.session?.expires_at,
            user: sessionData.session?.user?.id,
          },
          user: {
            exists: !!userData.user,
            error: userError?.message,
            id: userData.user?.id,
            email: userData.user?.email,
            metadata: userData.user?.user_metadata,
          },
          cookies,
          timestamp: new Date().toISOString(),
        })
      } catch (error: any) {
        setDebugInfo({
          error: error.message,
          stack: error.stack,
        })
      } finally {
        setLoading(false)
      }
    }

    debugAuth()
  }, [])

  const clearAuth = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=")
      const name = eqPos > -1 ? c.substr(0, eqPos) : c
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
    })

    // Clear local storage
    localStorage.clear()
    sessionStorage.clear()

    window.location.reload()
  }

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>

      <div className="space-y-6">
        <button onClick={clearAuth} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Clear All Auth Data & Reload
        </button>

        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  )
}
