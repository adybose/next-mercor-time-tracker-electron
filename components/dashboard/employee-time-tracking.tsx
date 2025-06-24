"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, Square, Clock, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Employee } from "@/lib/types"
import { ScreenshotService } from "@/lib/screenshot-service"


interface Task {
  id: string
  project_id: string
  task_name: string
  task_description: string
  status: "Assigned" | "In Progress" | "Completed"
  employee_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  projects: {
    name: string
    description: string
  }
}

interface ActiveTimeEntry {
  id: string
  task_id: string
  start_time: string
  is_active: boolean
  total_paused_seconds: number
}

interface EmployeeTimeTrackingProps {
  employee: Employee
}

export function EmployeeTimeTracking({ employee }: EmployeeTimeTrackingProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [activeTimeEntries, setActiveTimeEntries] = useState<Map<string, ActiveTimeEntry>>(new Map())
  const [timers, setTimers] = useState<Map<string, number>>(new Map())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const screenshotService = useRef(new ScreenshotService()).current
  // Track last screenshot time per task
  const lastScreenshotTimes = useRef<Map<string, number>>(new Map())

  // Timer update effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const newTimers = new Map(prev)
        activeTimeEntries.forEach((entry, taskId) => {
          if (entry.is_active) {
            const startTime = new Date(entry.start_time).getTime()
            const currentTime = Date.now()
            const elapsedSeconds = Math.floor((currentTime - startTime) / 1000) - entry.total_paused_seconds
            newTimers.set(taskId, Math.max(0, elapsedSeconds))
          }
        })
        return newTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimeEntries])

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          projects (
            name,
            description
          )
        `)
        .eq("employee_id", employee.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast.error("Failed to load tasks")
    }
  }, [employee.id, supabase])

  const fetchActiveTimeEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("is_active", true)

      if (error) throw error

      const entriesMap = new Map<string, ActiveTimeEntry>()
      data?.forEach((entry) => {
        entriesMap.set(entry.task_id, entry)
      })
      setActiveTimeEntries(entriesMap)
    } catch (error) {
      console.error("Error fetching active time entries:", error)
      toast.error("Failed to load active time entries")
    }
  }, [employee.id, supabase])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchActiveTimeEntries()])
      setLoading(false)
    }
    loadData()
  }, [fetchTasks, fetchActiveTimeEntries])

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredTasks(tasks)
    } else {
      setFilteredTasks(tasks.filter((task) => task.status === statusFilter))
    }
  }, [tasks, statusFilter])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getClientInfo = () => {
    // In a real application, you would get actual IP and MAC addresses
    // For demo purposes, we'll use placeholder values
    return {
      ip_address: "192.168.1.100", // This would be obtained from the client
      mac_address: "00:11:22:33:44:55", // This would be obtained from the client
    }
  }

  const startTask = async (taskId: string) => {
    try {
      const clientInfo = getClientInfo()

      const response = await fetch("/api/time-tracking/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
          description: "Task started from employee dashboard",
          ...clientInfo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start task")
      }

      await Promise.all([fetchTasks(), fetchActiveTimeEntries()])
      toast.success("Task started successfully")
    } catch (error) {
      console.error("Error starting task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start task")
    }
  }

  const pauseTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/time-tracking/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_id: taskId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to pause task")
      }

      await Promise.all([fetchTasks(), fetchActiveTimeEntries()])
      toast.success("Task paused")
    } catch (error) {
      console.error("Error pausing task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to pause task")
    }
  }

  const resumeTask = async (taskId: string) => {
    try {
      const clientInfo = getClientInfo()

      const response = await fetch("/api/time-tracking/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
          ...clientInfo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to resume task")
      }

      await Promise.all([fetchTasks(), fetchActiveTimeEntries()])
      toast.success("Task resumed")
    } catch (error) {
      console.error("Error resuming task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to resume task")
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/time-tracking/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_id: taskId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete task")
      }

      await Promise.all([fetchTasks(), fetchActiveTimeEntries()])
      toast.success("Task completed successfully")
    } catch (error) {
      console.error("Error completing task:", error)
      toast.error(error instanceof Error ? error.message : "Failed to complete task")
    }
  }

  const getTaskActions = (task: Task) => {
    const activeEntry = activeTimeEntries.get(task.id)
    const currentTimer = timers.get(task.id) || 0

    if (task.status === "Completed") {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        </div>
      )
    }

    if (!activeEntry) {
      // Task not started
      return (
        <Button onClick={() => startTask(task.id)} size="sm" className="bg-green-600 hover:bg-green-700">
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      )
    }

    if (activeEntry.is_active) {
      // Task is running
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
            <Clock className="h-3 w-3" />
            {formatTime(currentTimer)}
          </div>
          <Button onClick={() => pauseTask(task.id)} size="sm" variant="outline">
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
          <Button onClick={() => completeTask(task.id)} size="sm" className="bg-green-600 hover:bg-green-700">
            <Square className="h-4 w-4 mr-1" />
            Complete
          </Button>
        </div>
      )
    } else {
      // Task is paused
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-mono bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            <Pause className="h-3 w-3" />
            {formatTime(currentTimer)}
          </div>
          <Button onClick={() => resumeTask(task.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-1" />
            Resume
          </Button>
          <Button onClick={() => completeTask(task.id)} size="sm" className="bg-green-600 hover:bg-green-700">
            <Square className="h-4 w-4 mr-1" />
            Complete
          </Button>
        </div>
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Assigned":
        return <Badge variant="secondary">Assigned</Badge>
      case "In Progress":
        return (
          <Badge variant="default" className="bg-blue-600">
            In Progress
          </Badge>
        )
      case "Completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Screenshot interval effect
  useEffect(() => {
    const interval = setInterval(async () => {
      // For each active (running) time entry
      activeTimeEntries.forEach(async (entry, taskId) => {
        if (entry.is_active) {
          const now = Date.now()
          const lastTaken = lastScreenshotTimes.current.get(taskId) || 0
          // 10 minutes = 600,000 ms
          if (now - lastTaken >= 600_000) {
            try {
              if (window.electronAPI && window.electronAPI.takeScreenshot) {
                const screenshotData = await window.electronAPI.takeScreenshot()
                if (screenshotData) {
                  await screenshotService.handleScreenshotUpload(screenshotData, entry.id)
                  lastScreenshotTimes.current.set(taskId, now)
                  toast.success("Screenshot uploaded automatically.")
                }
              }
            } catch (err) {
              console.error("Auto screenshot error:", err)
              toast.error("Failed to upload automatic screenshot.")
            }
          }
        }
      })
    }, 60_000) // Check every minute

    return () => clearInterval(interval)
  }, [activeTimeEntries, screenshotService])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Tracking</CardTitle>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
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
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{task.task_name}</h4>
                        {getStatusBadge(task.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Project:</span> {task.projects.name}
                      </div>
                    </div>
                    <div className="ml-4">{getTaskActions(task)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
