"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Briefcase, User, LogOut } from 'lucide-react'
import { EmployeeTimeTracking } from "./employee-time-tracking"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Employee } from "@/lib/types"

interface EmployeeDashboardProps {
  employee: Employee
}

interface DashboardStats {
  totalHoursLogged: number
  activeProjects: number
  assignedTasks: number
  completedTasks: number
  organizationName: string
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalHoursLogged: 0,
    activeProjects: 0,
    assignedTasks: 0,
    completedTasks: 0,
    organizationName: "",
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardStats()
  }, [employee.id])

  const fetchDashboardStats = async () => {
    try {
      // Fetch organization name
      const { data: orgData } = await supabase
        .from("organizations")
        .select("company_name")
        .eq("id", employee.organization_id)
        .single()

      // Fetch time entries for total hours
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("employee_id", employee.id)
        .not("duration_seconds", "is", null)

      const totalSeconds = timeEntries?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0
      const totalHours = Math.round((totalSeconds / 3600) * 100) / 100

      // Fetch tasks assigned to employee
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*, projects!inner(id)")
        .eq("employee_id", employee.id)
        .eq("is_active", true)

      const assignedTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((task) => task.status === "Completed").length || 0

      // Get unique projects
      const uniqueProjects = new Set(tasks?.map((task) => task.project_id))
      const activeProjects = uniqueProjects.size

      setStats({
        totalHoursLogged: totalHours,
        activeProjects,
        assignedTasks,
        completedTasks,
        organizationName: orgData?.company_name || "Unknown Organization",
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {stats.organizationName} - Employee Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {employee.first_name} {employee.last_name}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursLogged}h</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">Projects with assigned tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedTasks}</div>
              <p className="text-xs text-muted-foreground">Active tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedTasks}</div>
              <p className="text-xs text-muted-foreground">Tasks finished</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Tracking Section */}
        <EmployeeTimeTracking employee={employee} />
      </main>
    </div>
  )
}
