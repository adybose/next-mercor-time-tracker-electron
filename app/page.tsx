import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, BarChart3, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">TimeTracker Pro</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Professional Time Tracking for Remote Teams</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Track employee time, capture screenshots, and manage projects with our comprehensive time tracking solution
            designed for remote work environments.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8 py-3">
              Start Free Trial
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Clock className="w-12 h-12 text-blue-600 mb-4" />
              <CardTitle>Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Accurate time tracking with automatic screenshot capture and activity monitoring.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-12 h-12 text-green-600 mb-4" />
              <CardTitle>Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Manage employees, assign projects, and organize teams efficiently.</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-12 h-12 text-purple-600 mb-4" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Detailed reports and analytics to track productivity and project progress.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-12 h-12 text-red-600 mb-4" />
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Secure data handling with fraud detection and permission monitoring.</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
          <p className="text-gray-600 mb-6">
            Join organizations worldwide who trust TimeTracker Pro for their remote team management.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">Create Organization Account</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">
                Employee Login
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
