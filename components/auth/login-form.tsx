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

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      console.log("🔐 Starting login process...")

      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error("❌ Auth error:", authError)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Login failed - no user data received")
        return
      }

      console.log("✅ Auth successful for user:", authData.user.id)

      // Wait for session to be established
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Use RPC function to bypass RLS issues
      console.log("🔍 Checking user type...")

      try {
        // Check organizations first
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, company_name")
          .eq("id", authData.user.id)
          .maybeSingle()

        console.log("Organizations query result:", { data: orgData, error: orgError })

        if (orgData) {
          console.log("✅ Organization user found:", orgData)
          router.push("/dashboard/organization")
          return
        }

        // Check employees
        const { data: empData, error: empError } = await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("id", authData.user.id)
          .maybeSingle()

        console.log("Employees query result:", { data: empData, error: empError })

        if (empData) {
          console.log("✅ Employee user found:", empData)
          router.push("/dashboard/employee")
          return
        }

        // If no user found, create employee record
        console.log("⚠️ User not found in database, creating employee record...")

        const { error: createError } = await supabase.from("employees").insert({
          id: authData.user.id,
          first_name: authData.user.user_metadata?.first_name || email.split("@")[0],
          last_name: authData.user.user_metadata?.last_name || "",
          email: authData.user.email,
        })

        if (createError) {
          console.error("❌ Error creating user record:", createError)
          setError("Account setup failed. Please contact support.")
          return
        }

        console.log("✅ Employee record created successfully")
        router.push("/dashboard/employee")
      } catch (dbError: any) {
        console.error("❌ Database error:", dbError)
        setError("Database connection error. Please try again.")
      }
    } catch (error: any) {
      console.error("❌ Login error:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
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
              placeholder="Enter your email"
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
              placeholder="Enter your password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
