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

      // Use the service role function to bypass RLS completely
      console.log("🔍 Checking user type with service function...")

      try {
        const { data: userTypeData, error: userTypeError } = await supabase.rpc("get_user_type", {
          user_id: authData.user.id,
        })

        console.log("User type result:", { data: userTypeData, error: userTypeError })

        if (userTypeError) {
          console.error("❌ User type check error:", userTypeError)
          setError("Database error. Please try again.")
          return
        }

        if (!userTypeData || userTypeData.length === 0) {
          console.log("⚠️ No user type data returned")
          setError("User account not found. Please contact support.")
          return
        }

        const userType = userTypeData[0]?.user_type
        const userData = userTypeData[0]?.user_data

        console.log("User type:", userType, "Data:", userData)

        if (userType === "organization") {
          console.log("✅ Organization user found")
          router.push("/dashboard/organization")
          return
        }

        if (userType === "employee") {
          console.log("✅ Employee user found")
          router.push("/dashboard/employee")
          return
        }

        if (userType === "not_found") {
          console.log("⚠️ User not found in database, creating employee record...")

          // Create employee record
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
          return
        }

        setError("Unknown user type. Please contact support.")
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
