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
  currentTimeEntry?: TimeEntry
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
  const [activeTimeEntries, setActiveTimeEntries] = useState<Map<string, TimeEntry>>(new Map())
  const [timers, setTimers] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<Map<string, boolean>>(new Map())
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Background update effect - updates time spent every 30 seconds
  useEffect(() => {
    const backgroundUpdate = setInterval(async () => {
      if (activeTimeEntries.size > 0) {
        try {
          await fetch("/api/time-tracking/update-background", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employee_id: employee.id }),
          })
        } catch (error) {
          console.error("Background update error:", error)
        }
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(backgroundUpdate)
  }, [activeTimeEntries, employee.id])

  // Timer update effect - updates UI every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const newTimers = new Map(prev)
        activeTimeEntries.forEach((entry, taskId) => {
          if (entry.is_active && entry.status === "running") {
            const startTime = new Date(entry.start_time).getTime()
            const pauseTime = entry.pause_start_time ? new Date(entry.pause_start_time).getTime() : 0
            const currentTime = Date.now()

            let elapsedSeconds = 0
            if (pauseTime > 0) {
              // Currently paused
              elapsedSeconds = Math.floor((pauseTime - startTime) / 1000) - (entry.total_paused_seconds || 0)
            } else {
              // Currently running
              elapsedSeconds = Math.floor((currentTime - startTime) / 1000) - (entry.total_paused_seconds || 0)
            }

            newTimers.set(taskId, Math.max(0, elapsedSeconds))
          }
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

      // Fetch active time entries
      const { data: activeEntries, error: activeError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .in("status", ["running", "paused"])

      if (activeError) {
        console.error("Active entries fetch error:", activeError)
      }

      // Calculate total time logged
      let totalSeconds = 0
      tasksData?.forEach((task) => {
        const taskEntries = task.time_entries || []
        const taskTotal = taskEntries.reduce((sum: number, entry: any) => {
          return sum + (entry.duration_seconds || 0)
        }, 0)
        totalSeconds += taskTotal
      })

      // Add currently running time
      activeEntries?.forEach((entry) => {
        if (entry.is_active && entry.status === "running") {
          const startTime = new Date(entry.start_time).getTime()
          const currentTime = Date.now()
          const elapsedSeconds = Math.floor((currentTime - startTime) / 1000) - (entry.total_paused_seconds || 0)
          totalSeconds += Math.max(0, elapsedSeconds)
        }
      })

      const assignedTasks = tasksData?.filter((task) => task.status !== "Completed").length || 0
      const completedTasks = tasksData?.filter((task) => task.status === "Completed").length || 0

      // Get unique projects
      const uniqueProjects = new Set(tasksData?.map((task) => task.project_id))
      const activeProjects = uniqueProjects.size

      setStats({
        totalHoursLogged: totalSeconds,
        activeProjects,
        assignedTasks,
        completedTasks,
        organizationName: orgData?.name || orgData?.company_name || "Unknown Organization",
      })

      setTasks(tasksData || [])

      // Set active time entries
      const entriesMap = new Map<string, TimeEntry>()
      activeEntries?.forEach((entry) => {
        entriesMap.set(entry.task_id, entry)
      })
      setActiveTimeEntries(entriesMap)
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
      await fetch("/api/time-tracking/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employee.id }),
      })
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

      // Update local state
      const { data: newEntry } = await supabase
        .from("time_entries")
        .select("*")
        .eq("task_id", taskId)
        .eq("employee_id", employee.id)
        .eq("is_active", true)
        .single()

      if (newEntry) {
        setActiveTimeEntries((prev) => new Map(prev).set(taskId, newEntry))
        setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: "In Progress" } : task)))
      }

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
      const response = await fetch("/api/time-tracking/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to pause task")
      }

      // Update local state
      setActiveTimeEntries((prev) => {
        const newMap = new Map(prev)
        const entry = newMap.get(taskId)
        if (entry) {
          newMap.set(taskId, { ...entry, is_active: false, status: "paused" })
        }
        return newMap
      })

      toast.success("Task paused")
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
      const response = await fetch("/api/time-tracking/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: taskId,
          ip_address: "192.168.1.100",
          mac_address: "00:11:22:33:44:55",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to resume task")
      }

      // Update local state
      setActiveTimeEntries((prev) => {
        const newMap = new Map(prev)
        const entry = newMap.get(taskId)
        if (entry) {
          newMap.set(taskId, { ...entry, is_active: true, status: "running" })
        }
        return newMap
      })

      toast.success("Task resumed")
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

      // Update local state
      setActiveTimeEntries((prev) => {
        const newMap = new Map(prev)
        newMap.delete(taskId)
        return newMap
      })

      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: "Completed" } : task)))

      // Update stats
      setStats((prev) => ({
        ...prev,
        completedTasks: prev.completedTasks + 1,
        assignedTasks: prev.assignedTasks - 1,
      }))

      toast.success("Task completed successfully")
      await fetchDashboardData() // Refresh to get final time
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

    if (activeEntry && activeEntry.status === "running") {
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

    if (activeEntry && activeEntry.status === "paused") {
      // Show paused timer
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            <Pause className="h-3 w-3" />
            {formatTime(currentTimer)}
          </div>
        </div>
      )
    }

    // Show accumulated time for in-progress tasks or 0 for assigned tasks
    const taskEntries = task.time_entries || []
    const totalSeconds = taskEntries.reduce((sum: number, entry: any) => {
      return sum + (entry.duration_seconds || 0)
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
      // Task not started
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

    if (activeEntry.is_active && activeEntry.status === "running") {
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
    } else if (activeEntry.status === "paused") {
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
      // Calculate total including current running time
      let totalSeconds = 0

      // Add completed time from all tasks
      tasks.forEach((task) => {
        const taskEntries = task.time_entries || []
        const taskTotal = taskEntries.reduce((sum: number, entry: any) => {
          return sum + (entry.duration_seconds || 0)
        }, 0)
        totalSeconds += taskTotal
      })

      // Add currently running time
      activeTimeEntries.forEach((entry, taskId) => {
        if (entry.is_active && entry.status === "running") {
          const currentTimer = timers.get(taskId) || 0
          totalSeconds += currentTimer
        }
      })

      setStats((prev) => ({
        ...prev,
        totalHoursLogged: totalSeconds,
      }))

      toast.success("Total hours refreshed")
    } catch (error) {
      console.error("Error refreshing total hours:", error)
      toast.error("Failed to refresh total hours")
    }
  }

  useEffect(() => {
    // Update total hours when timers change
    let totalSeconds = 0

    // Add completed time from all tasks
    tasks.forEach((task) => {
      const taskEntries = task.time_entries || []
      const taskTotal = taskEntries.reduce((sum: number, entry: any) => {
        return sum + (entry.duration_seconds || 0)
      }, 0)
      totalSeconds += taskTotal
    })

    // Add currently running time
    activeTimeEntries.forEach((entry, taskId) => {
      if (entry.is_active && entry.status === "running") {
        const currentTimer = timers.get(taskId) || 0
        totalSeconds += currentTimer
      }
    })

    setStats((prev) => ({
      ...prev,
      totalHoursLogged: totalSeconds,
    }))
  }, [timers, tasks, activeTimeEntries])

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
