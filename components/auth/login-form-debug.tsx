"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export function LoginFormDebug() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const router = useRouter()

  const addDebugInfo = (info: string) => {
    console.log(info)
    setDebugInfo((prev) => [...prev, info])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setDebugInfo([])

    try {
      const supabase = createClient()
      addDebugInfo("🔐 Starting login process...")

      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        addDebugInfo(`❌ Auth error: ${authError.message}`)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        addDebugInfo("❌ No user data received")
        setError("Login failed - no user data received")
        return
      }

      addDebugInfo(`✅ Auth successful for user: ${authData.user.id}`)
      addDebugInfo(`📧 Email: ${authData.user.email}`)
      addDebugInfo(`🔍 Checking database tables...`)

      // Check organizations table with multiple possible column names
      try {
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle()

        if (orgError) {
          addDebugInfo(`⚠️ Organizations query error: ${orgError.message}`)
        } else if (orgData) {
          addDebugInfo(`✅ Found in organizations: ${JSON.stringify(orgData)}`)
          router.push("/dashboard/organization")
          return
        } else {
          addDebugInfo("❌ Not found in organizations table")
        }
      } catch (err: any) {
        addDebugInfo(`❌ Organizations table error: ${err.message}`)
      }

      // Check employees table with multiple possible column names
      try {
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("*")
          .eq("id", authData.user.id)
          .maybeSingle()

        if (empError) {
          addDebugInfo(`⚠️ Employees query error: ${empError.message}`)
        } else if (empData) {
          addDebugInfo(`✅ Found in employees: ${JSON.stringify(empData)}`)
          router.push("/dashboard/employee")
          return
        } else {
          addDebugInfo("❌ Not found in employees table")
        }
      } catch (err: any) {
        addDebugInfo(`❌ Employees table error: ${err.message}`)
      }

      // Check what tables exist
      try {
        const { data: tables, error: tablesError } = await supabase
          .from("information_schema.tables")
          .select("table_name")
          .eq("table_schema", "public")

        if (tablesError) {
          addDebugInfo(`⚠️ Could not list tables: ${tablesError.message}`)
        } else {
          addDebugInfo(`📋 Available tables: ${tables?.map((t) => t.table_name).join(", ")}`)
        }
      } catch (err: any) {
        addDebugInfo(`❌ Table listing error: ${err.message}`)
      }

      // Final error
      addDebugInfo("❌ User not found in any table")
      setError("User account not found. Please contact support.")
    } catch (error: any) {
      addDebugInfo(`💥 Unexpected error: ${error.message}`)
      console.error("Login error:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Login</CardTitle>
          <CardDescription>Login with detailed debugging information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Debug Login"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {debugInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-sm">
              {debugInfo.map((info, index) => (
                <div key={index} className="p-2 bg-gray-100 rounded">
                  {info}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
