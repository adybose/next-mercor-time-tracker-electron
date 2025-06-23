"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Users, RefreshCw, Eye, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface TimeTrackingProps {
  organizationId: string
}

interface EmployeeTimeData {
  id: string
  name: string
  email: string
  status: "Active" | "Inactive"
  currentTask: string | null
  currentProject: string | null
  totalAllTime: number
  totalLastWeek: number
  totalToday: number
  currentActiveSeconds: number
  activeEntries: number
}

interface TimeTrackingSummary {
  totalEmployees: number
  activeEmployees: number
  totalHoursToday: number
  totalHoursWeek: number
  totalHoursAllTime: number
}

export function TimeTracking({ organizationId }: TimeTrackingProps) {
  const [employeeData, setEmployeeData] = useState<EmployeeTimeData[]>([])
  const [summary, setSummary] = useState<TimeTrackingSummary>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalHoursToday: 0,
    totalHoursWeek: 0,
    totalHoursAllTime: 0,
  })
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const supabase = createClient()

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData(false) // Silent refresh
    }, 30000)

    return () => clearInterval(interval)
  }, [organizationId])

  useEffect(() => {
    fetchProjects()
    refreshData()
  }, [organizationId])

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)

      setProjects(data || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const refreshData = async (showToast = true) => {
    try {
      if (showToast) setRefreshing(true)

      const response = await fetch("/api/time-tracking/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId }),
      })

      if (!response.ok) {
        throw new Error("Failed to refresh data")
      }

      const data = await response.json()
      setEmployeeData(data.employees || [])
      setSummary(
        data.summary || {
          totalEmployees: 0,
          activeEmployees: 0,
          totalHoursToday: 0,
          totalHoursWeek: 0,
          totalHoursAllTime: 0,
        },
      )

      if (showToast) {
        toast.success("Time tracking data refreshed")
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
      if (showToast) {
        toast.error("Failed to refresh data")
      }
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
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

  const formatDecimalHours = (seconds: number): string => {
    const hours = seconds / 3600
    return `${hours.toFixed(1)}h`
  }

  const getFilteredEmployees = () => {
    return employeeData.filter((emp) => {
      const employeeMatch = selectedEmployee === "all" || emp.id === selectedEmployee
      const projectMatch =
        selectedProject === "all" || emp.currentProject === projects.find((p) => p.id === selectedProject)?.name
      return employeeMatch && projectMatch
    })
  }

  const clearFilters = () => {
    setSelectedEmployee("all")
    setSelectedProject("all")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData()}
                disabled={refreshing}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDecimalHours(summary.totalHoursToday)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.activeEmployees} employee{summary.activeEmployees !== 1 ? "s" : ""} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Last Week</CardTitle>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData()}
                disabled={refreshing}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDecimalHours(summary.totalHoursWeek)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalEmployees} employee{summary.totalEmployees !== 1 ? "s" : ""} active last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours All Time</CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData()}
                disabled={refreshing}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDecimalHours(summary.totalHoursAllTime)}</div>
            <p className="text-xs text-muted-foreground">{summary.totalEmployees} total entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshData()}
                disabled={refreshing}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">{summary.activeEmployees} with logged hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entry Filters</CardTitle>
          <CardDescription>
            Filter by employee or project. Selecting one will show related options in the other filter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {employeeData.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={() => refreshData()} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Time Entries</CardTitle>
          <CardDescription>
            All employee time entries ({getFilteredEmployees().length} employee-project combinations)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>All Time</TableHead>
                <TableHead>Last Week</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredEmployees().map((employee) => {
                const initials = employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {employee.currentProject || "No active project"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatDecimalHours(employee.totalAllTime)}</div>
                      <div className="text-sm text-muted-foreground">{employee.activeEntries} entries</div>
                    </TableCell>
                    <TableCell>{formatDecimalHours(employee.totalLastWeek)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatDecimalHours(employee.totalToday)}</span>
                        {employee.status === "Active" && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active today
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.status === "Active" ? "default" : "secondary"}
                        className={employee.status === "Active" ? "bg-green-100 text-green-800" : ""}
                      >
                        {employee.status}
                      </Badge>
                      {employee.currentTask && (
                        <div className="text-xs text-muted-foreground mt-1">Working on: {employee.currentTask}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {getFilteredEmployees().length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No employee time entries found matching the current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
