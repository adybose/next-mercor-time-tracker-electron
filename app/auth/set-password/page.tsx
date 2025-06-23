"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, CheckCircle } from "lucide-react"

export default function SetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isInvite, setIsInvite] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const type = searchParams.get("type")
    setIsInvite(type === "invite")

    const handleAuthStateChange = async () => {
      try {
        // First check if there's a hash fragment (from email link)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (accessToken && refreshToken) {
          // Set the session from the tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error("Error setting session:", error)
            setError("Invalid or expired invitation link")
            setInitialLoading(false)
            return
          }

          setUserInfo(data.user)
        } else {
          // Check if user is already logged in
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            setUserInfo(user)
          } else {
            // No user found, redirect to login
            router.push("/auth/login?message=Please log in to set your password")
            return
          }
        }
      } catch (error) {
        console.error("Auth error:", error)
        setError("Failed to authenticate. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    handleAuthStateChange()
  }, [searchParams, router, supabase.auth])

  const validatePassword = () => {
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields")
      return false
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return false
    }

    // Check for at least one uppercase, one lowercase, and one number
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number")
      return false
    }

    return true
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validatePassword()) {
      return
    }

    setLoading(true)

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) throw updateError

      // If this is an employee invitation, mark as email verified
      if (isInvite && userInfo?.id) {
        // Call API to update employee verification status
        const response = await fetch("/api/employees/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userInfo.id,
          }),
        })

        if (!response.ok) {
          console.error("Failed to update email verification status")
        }
      }

      setSuccess(true)
    } catch (error: any) {
      console.error("Password update error:", error)
      setError(error.message || "Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                {error || "Unable to authenticate. Please check your invitation link or try again."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={() => router.push("/auth/login")} variant="outline">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success screen matching the signup confirmation design
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isInvite ? "Welcome to Your Account" : "Password Reset Complete"}
            </h1>
            <p className="text-gray-600">
              {isInvite ? "Your account has been set up successfully" : "Your password has been updated successfully"}
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <h2 className="text-xl font-semibold text-green-600 mb-4">Password Set Successfully!</h2>

                <p className="text-gray-600 mb-6">
                  {isInvite
                    ? "You can now log in to your account and start using the platform."
                    : "You can now log in with your new password."}
                </p>

                <Button onClick={() => router.push("/auth/login")} className="w-full" size="lg">
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Password setup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isInvite ? "Set Up Your Password" : "Reset Your Password"}
          </h1>
          <p className="text-gray-600">
            {isInvite
              ? `Welcome ${userInfo.user_metadata?.first_name || ""}! Create a secure password for your account.`
              : "Please enter your new password below."}
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 pb-8">
            <form onSubmit={handleSetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">Password requirements:</p>
                <ul className="space-y-1">
                  <li className="flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    At least 8 characters long
                  </li>
                  <li className="flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    Contains uppercase and lowercase letters
                  </li>
                  <li className="flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    Contains at least one number
                  </li>
                </ul>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? "Setting Password..." : "Set Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
