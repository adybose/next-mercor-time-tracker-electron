import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-red-600">Verification Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-gray-600">There was an error verifying your email. This could be because:</div>
          <ul className="text-sm text-gray-500 text-left space-y-1">
            <li>• The verification link has expired</li>
            <li>• The link has already been used</li>
            <li>• There was a network error</li>
          </ul>
          <div className="space-y-2">
            <Link href="/auth/login">
              <Button className="w-full">Try Logging In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full">
                Sign Up Again
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
