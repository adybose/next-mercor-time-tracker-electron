import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

function LoginFormWrapper() {
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign In</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Access your time tracking dashboard</p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <LoginFormWrapper />
        </Suspense>
      </div>
    </div>
  )
}
