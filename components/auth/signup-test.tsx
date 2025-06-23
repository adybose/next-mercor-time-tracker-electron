"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export function SignupTest() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string>("")

  const testSignup = async () => {
    setTesting(true)
    setResult("")

    try {
      const supabase = createClient()

      // Test the signup process
      const testEmail = `test-${Date.now()}@example.com`
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: "test123456",
        options: {
          data: {
            user_type: "organization",
            organization_name: "Test Organization",
          },
        },
      })

      if (error) {
        setResult(`❌ Error: ${error.message}`)
      } else if (data.user) {
        setResult(`✅ Success! User created with ID: ${data.user.id}`)

        // Check if organization was created
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", data.user.id)
          .single()

        if (orgError) {
          setResult((prev) => prev + `\n⚠️ Organization check failed: ${orgError.message}`)
        } else if (orgData) {
          setResult((prev) => prev + `\n✅ Organization created: ${orgData.name}`)
        }
      }
    } catch (error: any) {
      setResult(`❌ Unexpected error: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Signup Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testSignup} disabled={testing} className="w-full">
          {testing ? "Testing..." : "Test Signup Process"}
        </Button>
        {result && <pre className="text-sm bg-gray-100 p-3 rounded whitespace-pre-wrap">{result}</pre>}
      </CardContent>
    </Card>
  )
}
