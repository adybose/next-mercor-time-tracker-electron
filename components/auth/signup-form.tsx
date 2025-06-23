"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export function SignupForm() {
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [emailValidating, setEmailValidating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const validateEmail = async (email: string) => {
    if (!email || !email.includes("@")) return

    setEmailValidating(true)
    try {
      const response = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          context: "organization_signup",
        }),
      })

      const data = await response.json()

      if (!data.available) {
        setError(data.error)
      } else {
        setError("")
      }
    } catch (error) {
      console.error("Email validation error:", error)
    } finally {
      setEmailValidating(false)
    }
  }

  const handleEmailBlur = () => {
    if (formData.email) {
      validateEmail(formData.email)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    if (!formData.organizationName.trim()) {
      setError("Organization name is required")
      setLoading(false)
      return
    }

    // Final email validation before submission
    try {
      const emailValidation = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          context: "organization_signup",
        }),
      })

      const emailData = await emailValidation.json()

      if (!emailData.available) {
        setError(emailData.error)
        setLoading(false)
        return
      }
    } catch (error) {
      console.error("Email validation error:", error)
      setError("Failed to validate email. Please try again.")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      console.log("Starting signup process...")

      // Get the current origin for redirect URL
      const origin = window.location.origin

      // Sign up the user with proper redirect URL
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            user_type: "organization",
            organization_name: formData.organizationName.trim(),
          },
        },
      })

      console.log("Auth response:", { authData, authError })

      if (authError) {
        console.error("Auth error:", authError)

        // Handle specific Supabase auth errors
        if (authError.message?.includes("User already registered")) {
          setError("An account with this email already exists. Please try logging in instead.")
        } else {
          throw authError
        }
        setLoading(false)
        return
      }

      if (authData.user) {
        console.log("User created successfully:", authData.user.id)

        // Check if organization was created by the trigger
        setTimeout(async () => {
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", authData.user.id)
            .single()

          console.log("Organization check:", { orgData, orgError })
        }, 2000)

        setSuccess(true)
      } else {
        throw new Error("User creation failed - no user data returned")
      }
    } catch (error: any) {
      console.error("Signup error:", error)

      // Provide more specific error messages
      if (error.message?.includes("User already registered")) {
        setError("An account with this email already exists. Please try logging in instead.")
      } else if (error.message?.includes("Invalid email")) {
        setError("Please enter a valid email address.")
      } else if (error.message?.includes("Password")) {
        setError("Password must be at least 6 characters long.")
      } else {
        setError(error.message || "An error occurred during signup. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-green-600 text-lg font-semibold">Account Created Successfully!</div>
            <p className="text-sm text-gray-600">
              Please check your email and click the verification link to activate your account.
            </p>
            <p className="text-xs text-gray-500">
              After verification, you'll be automatically redirected to your dashboard.
            </p>
            <Button onClick={() => router.push("/auth/login")} variant="outline" className="mt-4">
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Organization Signup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input
              id="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
              required
              disabled={loading}
              placeholder="Enter your organization name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              onBlur={handleEmailBlur}
              required
              disabled={loading || emailValidating}
              placeholder="Enter your email address"
            />
            {emailValidating && <p className="text-xs text-muted-foreground">Checking email availability...</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              required
              disabled={loading}
              minLength={6}
              placeholder="Enter a secure password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              required
              disabled={loading}
              minLength={6}
              placeholder="Confirm your password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || emailValidating || !!error}>
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Export with both names for compatibility
export { SignupForm as SignUpForm }
