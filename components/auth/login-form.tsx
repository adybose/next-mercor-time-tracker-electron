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

      // Sign in the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Login failed - no user data received")
        return
      }

      // Wait a moment for the session to be established
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check if user exists in our database
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, company_name")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (orgData) {
        console.log("Organization user found:", orgData)
        router.push("/dashboard/organization")
        return
      }

      const { data: empData } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("id", authData.user.id)
        .maybeSingle()

      if (empData) {
        console.log("Employee user found:", empData)
        router.push("/dashboard/employee")
        return
      }

      // If user doesn't exist in our tables, create them
      console.log("User not found in database, creating record...")

      // Try to create employee record (default)
      const { error: createError } = await supabase.from("employees").insert({
        id: authData.user.id,
        first_name: authData.user.user_metadata?.first_name || email.split("@")[0],
        last_name: authData.user.user_metadata?.last_name || "",
        email: authData.user.email,
      })

      if (createError) {
        console.error("Error creating user record:", createError)
        setError("Account setup failed. Please contact support.")
        return
      }

      console.log("Employee record created successfully")
      router.push("/dashboard/employee")
    } catch (error: any) {
      console.error("Login error:", error)
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
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
