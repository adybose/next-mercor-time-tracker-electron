"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Briefcase, User, LogOut, Play, Pause, Square, CheckCircle, RefreshCw } from "lucide-react"
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
  currentTimeEntry?: any
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
  const [activeTimeEntries, setActiveTimeEntries] = useState<Map<string, any>>(new Map())
  const [timers, setTimers] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Map<string, boolean>>(new Map())
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Timer update effect - updates UI every second for running tasks only
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const newTimers = new Map(prev)
        activeTimeEntries.forEach((entry, taskId) => {
          if (entry.display_status === "running" && entry.is_currently_active) {
            // Only update running tasks
            const startTime = new Date(entry.start_time).getTime()
            const currentTime = Date.now()
            const totalPausedMs = (entry.total_paused_seconds || 0) * 1000
            const currentDurationSeconds = Math.floor((currentTime - startTime - totalPausedMs) / 1000)
            newTimers.set(taskId, Math.max(0, currentDurationSeconds))
          }
          // For paused tasks, keep the stored duration (don't update)
        })
        return newTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimeEntries])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch organization name
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("name, company_name")
        .eq("id", employee.organization_id)
        .single()

      if (orgError) {
        console.error("Organization fetch error:", orgError)
      }

      // Fetch tasks with time entries
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          projects!inner(id, name),
          time_entries(*)
        `)
        .eq("employee_id", employee.id)
        .eq("is_active", true)

      if (tasksError) {
        console.error("Tasks fetch error:", tasksError)
      }

      // Get time tracking status
      const statusResponse = await fetch("/api/time-tracking/status")
      let statusData = { time_entries: [], employee_status: "offline" }

      if (statusResponse.ok) {
        statusData = await statusResponse.json()
      } else {
        console.error("Failed to fetch time tracking status")
      }

      // Calculate total time logged including current active time
      let totalSeconds = 0

      // Add completed time from all tasks
      tasksData?.forEach((task) => {
        const taskEntries = task.time_entries || []
        const taskTotal = taskEntries.reduce((sum: number, entry: any) => {
          if (entry.status === "completed" && entry.duration_seconds) {
            return sum + entry.duration_seconds
          }
          return sum
        }, 0)
        totalSeconds += taskTotal
      })

      // Add current active/paused time from status API
      statusData.time_entries?.forEach((entry: any) => {
        if (entry.is_active) {
          totalSeconds += entry.display_duration_seconds || 0
        }
      })

      const assignedTasks = tasksData?.filter((task) => task.status !== "Completed").length || 0
      const completedTasks = tasksData?.filter((task) => task.status === "Completed").length || 0
      const uniqueProjects = new Set(tasksData?.map((task) => task.project_id))

      setStats({
        totalHoursLogged: totalSeconds,
        activeProjects: uniqueProjects.size,
        assignedTasks,
        completedTasks,
        organizationName: orgData?.name || orgData?.company_name || "Unknown Organization",
      })

      setTasks(tasksData || [])

      // Set active time entries from status API
      const entriesMap = new Map<string, any>()
      const timersMap = new Map<string, number>()

      statusData.time_entries?.forEach((entry: any) => {
        if (entry.is_active) {
          entriesMap.set(entry.task_id, entry)
          // Initialize timer with current duration
          timersMap.set(entry.task_id, entry.display_duration_seconds || 0)
        }
      })

      setActiveTimeEntries(entriesMap)
      setTimers(timersMap)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [employee.id, employee.organization_id, supabase])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  useEffect(() => {
    filterTasks()
  }, [tasks, statusFilter])

  const filterTasks = () => {
    if (statusFilter === "all") {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter((task) => task.status.toLowerCase() === statusFilter.toLowerCase()))
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else if (minutes > 0) {
      return `${minutes}m`
    } else {
      return "0m"
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await fetchDashboardData()
      toast.success("Data refreshed successfully")
    } catch (error) {
      console.error("Refresh error:", error)
      toast.error("Failed to refresh data")
    } finally {
      setRefreshing(false)
    }
  }

  const setTaskLoading = (taskId: string, loading: boolean) => {
    setActionLoading((prev) => {
      const newMap = new Map(prev)
      if (loading) {
        newMap.set(taskId, true)
      } else {
        newMap.delete(taskId)
      }
      return newMap
    })
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
    setTaskLoading(taskId, true)
    try {
      const response = await fetch("/api/time-tracking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          description: "Task started from employee dashboard",
          ip_address: "192.168.1.100",
          mac_address: "00:11:22:33:44:55",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start task")
      }

      const result = await response.json()
      console.log("Task started:", result)

      await fetchDashboardData()
      toast.success("Task started successfully")
    } catch (error) {
      console.error("Error starting task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start task")
    } finally {
      setTaskLoading(taskId, false)
    }
  }

  const pauseTimeTracking = async (taskId: string) => {
    setTaskLoading(taskId, true)
    try {
      console.log("Attempting to pause task:", taskId)

      const response = await fetch("/api/time-tracking/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      })

      const result = await response.json()
      console.log("Pause response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to pause task")
      }

      // Immediately update local state to show paused status
      setActiveTimeEntries((prev) => {
        const newMap = new Map(prev)
        const entry = newMap.get(taskId)
        if (entry) {
          newMap.set(taskId, {
            ...entry,
            display_status: "paused",
            is_currently_active: false,
            is_currently_paused: true,
            current_duration_seconds: result.current_duration_seconds,
          })
        }
        return newMap
      })

      // Update timer to show paused time
      setTimers((prev) => {
        const newMap = new Map(prev)
        newMap.set(taskId, result.current_duration_seconds || 0)
        return newMap
      })

      await fetchDashboardData()
      toast.success("Task paused successfully")
    } catch (error) {
      console.error("Error pausing task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to pause task")
    } finally {
      setTaskLoading(taskId, false)
    }
  }

  const resumeTimeTracking = async (taskId: string) => {
    setTaskLoading(taskId, true)
    try {
      console.log("Attempting to resume task:", taskId)

      const response = await fetch("/api/time-tracking/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          ip_address: "192.168.1.100",
          mac_address: "00:11:22:33:44:55",
        }),
      })

      const result = await response.json()
      console.log("Resume response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to resume task")
      }

      // Immediately update local state to show running status
      setActiveTimeEntries((prev) => {
        const newMap = new Map(prev)
        const entry = newMap.get(taskId)
        if (entry) {
          newMap.set(taskId, {
            ...entry,
            display_status: "running",
            is_currently_active: true,
            is_currently_paused: false,
            total_paused_seconds: result.total_paused_seconds,
          })
        }
        return newMap
      })

      await fetchDashboardData()
      toast.success("Task resumed successfully")
    } catch (error) {
      console.error("Error resuming task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to resume task")
    } finally {
      setTaskLoading(taskId, false)
    }
  }

  const completeTask = async (taskId: string) => {
    setTaskLoading(taskId, true)
    try {
      const response = await fetch("/api/time-tracking/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete task")
      }

      await fetchDashboardData()
      toast.success("Task completed successfully")
    } catch (error) {
      console.error("Error completing task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to complete task")
    } finally {
      setTaskLoading(taskId, false)
    }
  }

  const getTimeSpentDisplay = (task: TaskWithProject) => {
    const activeEntry = activeTimeEntries.get(task.id)
    const currentTimer = timers.get(task.id) || 0

    if (task.status === "Completed") {
      // Show final time spent from database
      const taskEntries = task.time_entries || []
      const totalSeconds = taskEntries.reduce((sum: number, entry: any) => {
        return sum + (entry.duration_seconds || 0)
      }, 0)
      return <div className="text-sm font-medium">{formatDuration(totalSeconds)}</div>
    }

    if (activeEntry?.display_status === "running" && activeEntry?.is_currently_active) {
      // Show running timer
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
            <Clock className="h-3 w-3" />
            {formatTime(currentTimer)}
          </div>
        </div>
      )
    }

    if (activeEntry?.display_status === "paused" && activeEntry?.is_currently_paused) {
      // Show paused timer with accumulated time
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            <Pause className="h-3 w-3" />
            {formatTime(currentTimer)}
          </div>
        </div>
      )
    }

    // Show accumulated time for tasks without active entries
    const taskEntries = task.time_entries || []
    const totalSeconds = taskEntries.reduce((sum: number, entry: any) => {
      if (entry.status === "completed") {
        return sum + (entry.duration_seconds || 0)
      }
      return sum
    }, 0)

    return <div className="text-sm text-gray-600">{totalSeconds > 0 ? formatDuration(totalSeconds) : "0h 0m"}</div>
  }

  const getTaskActions = (task: TaskWithProject) => {
    const activeEntry = activeTimeEntries.get(task.id)
    const isLoading = actionLoading.get(task.id) || false

    if (task.status === "Completed") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    }

    if (!activeEntry) {
      // Task not started or no active time entry
      return (
        <Button
          onClick={() => startTimeTracking(task.id)}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          disabled={isLoading}
        >
          <Play className="h-4 w-4 mr-1" />
          {isLoading ? "Starting..." : "Start"}
        </Button>
      )
    }

    if (activeEntry.display_status === "running" && activeEntry.is_currently_active) {
      // Task is running
      return (
        <div className="flex items-center gap-2">
          <Button onClick={() => pauseTimeTracking(task.id)} size="sm" variant="outline" disabled={isLoading}>
            <Pause className="h-4 w-4 mr-1" />
            {isLoading ? "Pausing..." : "Pause"}
          </Button>
          <Button
            onClick={() => completeTask(task.id)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            <Square className="h-4 w-4 mr-1" />
            {isLoading ? "Completing..." : "Complete"}
          </Button>
        </div>
      )
    } else if (activeEntry.display_status === "paused" && activeEntry.is_currently_paused) {
      // Task is paused
      return (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => resumeTimeTracking(task.id)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            <Play className="h-4 w-4 mr-1" />
            {isLoading ? "Resuming..." : "Resume"}
          </Button>
          <Button
            onClick={() => completeTask(task.id)}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            <Square className="h-4 w-4 mr-1" />
            {isLoading ? "Completing..." : "Complete"}
          </Button>
        </div>
      )
    }

    return null
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

  const refreshTotalHours = async () => {
    try {
      await fetchDashboardData()
      toast.success("Total hours refreshed")
    } catch (error) {
      console.error("Error refreshing total hours:", error)
      toast.error("Failed to refresh total hours")
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
            <div className="flex items-center gap-2">
              <Button onClick={refreshData} variant="outline" size="sm" disabled={refreshing}>
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
              <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={refreshTotalHours} size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.totalHoursLogged)}</div>
              <p className="text-xs text-muted-foreground">All time (including current)</p>
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
        <Card>
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
              <div className="text-center py-8 text-gray-500">
                {statusFilter === "all" ? "No tasks assigned yet." : `No tasks with status "${statusFilter}".`}
              </div>
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
                      <TableCell>{getTimeSpentDisplay(task)}</TableCell>
                      <TableCell>{getTaskActions(task)}</TableCell>
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
