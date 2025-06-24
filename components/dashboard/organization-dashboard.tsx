"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Users, Clock, Briefcase, CheckCircle, LogOut } from "lucide-react"
import { EmployeeManagement } from "./employee-management"
import { ProjectManagement } from "./project-management"
import { TimeTracking } from "./time-tracking"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Organization } from "@/lib/types"
import { useRouter } from "next/navigation"

interface OrganizationDashboardProps {
  organization: Organization
}

interface DashboardStats {
  totalEmployees: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalHoursToday: number
  totalHoursWeek: number
  totalHoursAllTime: number
  activeEmployees: number
}

export function OrganizationDashboard({ organization }: OrganizationDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalHoursToday: 0,
    totalHoursWeek: 0,
    totalHoursAllTime: 0,
    activeEmployees: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout")
    }
  }

  // Only render the header/navbar and the message
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{organization.name} - Organization Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your organization, employees, and projects</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Message */}
      <main className="flex flex-col items-center justify-center h-[60vh]">
        <div className="bg-white rounded-lg shadow p-8 mt-12 text-center max-w-lg">
          <p className="text-lg font-semibold mb-4">This app is for Employees of your Organization. Visit <a href="https://next-mercor-time-tracker.vercel.app" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://next-mercor-time-tracker.vercel.app</a> to track their work.</p>
        </div>
      </main>
    </div>
  )
}
