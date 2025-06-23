import { Suspense } from "react"
import { SignupForm } from "@/components/auth/signup-form"

function SignupFormWrapper() {
  return <SignupForm />
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create Organization Account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign up to start tracking employee time</p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <SignupFormWrapper />
        </Suspense>
      </div>
    </div>
  )
}
