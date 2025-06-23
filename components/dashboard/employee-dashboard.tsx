"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Briefcase, User, LogOut, Play, Square } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Employee, Task, Project, TimeEntry } from "@/lib/types"

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

interface TaskWithProject extends Task {
  projects?: Project
  time_entries?: TimeEntry[]
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalHoursLogged: 0,
    activeProjects: 0,
    assignedTasks: 0,
    completedTasks: 0,
    organizationName: "Unknown Organization",
  })
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [filteredTasks, setFilteredTasks] = useState<TaskWithProject[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [employee.id])

  useEffect(() => {
    filterTasks()
  }, [tasks, statusFilter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch organization name
      const { data: orgData } = await supabase
        .from("organizations")
        .select("company_name")
        .eq("id", employee.organization_id)
        .single()

      // Fetch tasks assigned to employee with project info
      const { data: tasksData } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(id, name),
          time_entries(*)
        `)
        .eq("employee_id", employee.id)
        .eq("is_active", true)

      // Fetch time entries for total hours
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("employee_id", employee.id)
        .not("duration_seconds", "is", null)

      // Check for active time entry
      const { data: activeEntry } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .is("end_time", null)
        .single()

      const totalSeconds = timeEntries?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0
      const totalHours = Math.round((totalSeconds / 3600) * 100) / 100

      const assignedTasks = tasksData?.length || 0
      const completedTasks = tasksData?.filter((task) => task.status === "Completed").length || 0

      // Get unique projects
      const uniqueProjects = new Set(tasksData?.map((task) => task.project_id))
      const activeProjects = uniqueProjects.size

      setStats({
        totalHoursLogged: totalHours,
        activeProjects,
        assignedTasks,
        completedTasks,
        organizationName: orgData?.company_name || "Unknown Organization",
      })

      setTasks(tasksData || [])
      setActiveTimeEntry(activeEntry)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    if (statusFilter === "all") {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter((task) => task.status.toLowerCase() === statusFilter.toLowerCase()))
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

  const startTimeTracking = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: employee.id,
          task_id: taskId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setActiveTimeEntry(data)
      toast.success("Time tracking started")
      fetchDashboardData()
    } catch (error) {
      console.error("Error starting time tracking:", error)
      toast.error("Failed to start time tracking")
    }
  }

  const stopTimeTracking = async () => {
    if (!activeTimeEntry) return

    try {
      const endTime = new Date()
      const startTime = new Date(activeTimeEntry.start_time)
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", activeTimeEntry.id)

      if (error) throw error

      setActiveTimeEntry(null)
      toast.success("Time tracking stopped")
      fetchDashboardData()
    } catch (error) {
      console.error("Error stopping time tracking:", error)
      toast.error("Failed to stop time tracking")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Assigned":
        return "bg-blue-100 text-blue-800"
      case "In Progress":
        return "bg-yellow-100 text-yellow-800"
      case "Completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
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
              <h1 className="text-xl font-semibold text-gray-900">{stats.organizationName} - Employee Dashboard</h1>
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
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Time Tracking</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks assigned yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.task_name}</TableCell>
                      <TableCell>{task.projects?.name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(task.status)}>{task.status}</Badge>
                      </TableCell>
                      <TableCell>{Math.round(((task.time_spent || 0) / 3600) * 100) / 100}h</TableCell>
                      <TableCell>
                        {activeTimeEntry?.task_id === task.id ? (
                          <Button onClick={stopTimeTracking} size="sm" variant="destructive">
                            <Square className="h-4 w-4 mr-1" />
                            Stop
                          </Button>
                        ) : (
                          <Button onClick={() => startTimeTracking(task.id)} size="sm" disabled={!!activeTimeEntry}>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
