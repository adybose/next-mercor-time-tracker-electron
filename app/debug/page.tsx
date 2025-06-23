import { SignupTest } from "@/components/auth/signup-test"

export default function DebugPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Debug Tools</h1>
          <p className="text-gray-600">Test the signup functionality</p>
        </div>
        <SignupTest />
      </div>
    </div>
  )
}
