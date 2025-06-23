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

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(false) // Silent refresh
    }, 30000)

    return () => clearInterval(interval)
  }, [organization.id])

  useEffect(() => {
    fetchStats()
  }, [organization.id])

  const fetchStats = async (showToast = true) => {
    try {
      if (showToast) setRefreshing(true)

      // Update background time tracking first
      await fetch("/api/time-tracking/update-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organization.id }),
      })

      // Get updated time tracking data
      const timeResponse = await fetch("/api/time-tracking/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organization.id }),
      })

      let timeData = { summary: null }
      if (timeResponse.ok) {
        timeData = await timeResponse.json()
      }

      // Fetch other stats
      const [employeesRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from("employees").select("id").eq("organization_id", organization.id).eq("is_active", true),
        supabase.from("projects").select("id").eq("organization_id", organization.id).eq("is_active", true),
        supabase.from("tasks").select("id, status").eq("is_active", true),
      ])

      const totalEmployees = employeesRes.data?.length || 0
      const activeProjects = projectsRes.data?.length || 0
      const totalTasks = tasksRes.data?.length || 0
      const completedTasks = tasksRes.data?.filter((task) => task.status === "Completed").length || 0

      setStats({
        totalEmployees,
        activeProjects,
        totalTasks,
        completedTasks,
        totalHoursToday: timeData.summary?.totalHoursToday || 0,
        totalHoursWeek: timeData.summary?.totalHoursWeek || 0,
        totalHoursAllTime: timeData.summary?.totalHoursAllTime || 0,
        activeEmployees: timeData.summary?.activeEmployees || 0,
      })

      if (showToast) {
        toast.success("Dashboard data refreshed")
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      if (showToast) {
        toast.error("Failed to refresh dashboard data")
      }
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = seconds / 3600
    return `${hours.toFixed(1)}h`
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
              <h1 className="text-xl font-semibold text-gray-900">{organization.name} - Organization Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your organization, employees, and projects</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => fetchStats()} disabled={refreshing} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">{stats.activeEmployees} currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">Projects in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">{stats.completedTasks} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.totalHoursToday)}</div>
              <p className="text-xs text-muted-foreground">All employees combined</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="employees" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="time-tracking">Time Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="employees">
            <EmployeeManagement organizationId={organization.id} />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectManagement organizationId={organization.id} />
          </TabsContent>

          <TabsContent value="time-tracking">
            <TimeTracking organizationId={organization.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
