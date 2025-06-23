"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, TrendingUp, Activity, RefreshCw } from "lucide-react"
import type { Employee, TimeEntry, Project } from "@/lib/types"

interface EmployeeTimeDetailsModalProps {
  employee: Employee | null
  organizationId: string
  isOpen: boolean
  onClose: () => void
}

interface DailyTimeData {
  date: string
  hours: number
  entries: number
  projects: string[]
  timeEntries: TimeEntryWithProject[]
}

interface TimeEntryWithProject extends TimeEntry {
  project?: Project
}

export function EmployeeTimeDetailsModal({ employee, organizationId, isOpen, onClose }: EmployeeTimeDetailsModalProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithProject[]>([])
  const [dailyData, setDailyData] = useState<DailyTimeData[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("calendar")

  useEffect(() => {
    if (isOpen && employee) {
      fetchEmployeeTimeData()
    }
  }, [isOpen, employee, organizationId])

  const fetchEmployeeTimeData = async () => {
    if (!employee) return

    try {
      setLoading(true)

      // Fetch detailed time entries for this employee
      const response = await fetch(`/api/time-entries?organization_id=${organizationId}&employee_id=${employee.id}`)
      const data = await response.json()

      if (data.timeEntries) {
        setTimeEntries(data.timeEntries)
        processDailyData(data.timeEntries)
      }
    } catch (error) {
      console.error("Error fetching employee time data:", error)
    } finally {
      setLoading(false)
    }
  }

  const processDailyData = (entries: TimeEntryWithProject[]) => {
    const dailyMap = new Map<string, DailyTimeData>()

    entries.forEach((entry) => {
      if (!entry.duration_seconds) return

      const date = new Date(entry.start_time).toISOString().split("T")[0]
      const hours = entry.duration_seconds / 3600
      const projectName = entry.project?.name || "Unknown Project"

      if (dailyMap.has(date)) {
        const existing = dailyMap.get(date)!
        existing.hours += hours
        existing.entries += 1
        existing.timeEntries.push(entry)
        if (!existing.projects.includes(projectName)) {
          existing.projects.push(projectName)
        }
      } else {
        dailyMap.set(date, {
          date,
          hours,
          entries: 1,
          projects: [projectName],
          timeEntries: [entry],
        })
      }
    })

    const sortedData = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    setDailyData(sortedData)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getTotalStats = () => {
    const totalHours = dailyData.reduce((sum, day) => sum + day.hours, 0)
    const totalEntries = dailyData.reduce((sum, day) => sum + day.entries, 0)
    const totalDays = dailyData.length
    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    // Calculate this week's hours
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const thisWeekHours = dailyData
      .filter((day) => new Date(day.date) >= startOfWeek)
      .reduce((sum, day) => sum + day.hours, 0)

    return { totalHours, totalEntries, totalDays, avgHoursPerDay, thisWeekHours }
  }

  const getRecentActivity = () => {
    return dailyData.slice(0, 14) // Last 14 days
  }

  if (!employee) return null

  const stats = getTotalStats()
  const recentActivity = getRecentActivity()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-white">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </span>
            </div>
            <div>
              <div className="text-xl">
                {employee.first_name} {employee.last_name}
              </div>
              <div className="text-sm text-gray-500 font-normal">{employee.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription>Complete time tracking history and daily activity breakdown</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-gray-500">Loading detailed time data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enhanced Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatHours(stats.totalHours)}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatHours(stats.thisWeekHours)}</div>
                  <p className="text-xs text-muted-foreground">Current week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEntries}</div>
                  <p className="text-xs text-muted-foreground">Time sessions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDays}</div>
                  <p className="text-xs text-muted-foreground">Days worked</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatHours(stats.avgHoursPerDay)}</div>
                  <p className="text-xs text-muted-foreground">Hours per day</p>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendar View
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Timeline View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Time Tracking Calendar</CardTitle>
                    <CardDescription>Complete history of hours worked each day since account creation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyData.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries found</h3>
                        <p className="text-gray-500">This employee hasn't logged any time yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dailyData.map((day) => (
                          <div key={day.date} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    day.hours >= 8 ? "bg-green-500" : day.hours >= 4 ? "bg-yellow-500" : "bg-blue-500"
                                  }`}
                                ></div>
                                <div>
                                  <div className="font-medium text-lg">{formatDate(day.date)}</div>
                                  <div className="text-sm text-gray-500">
                                    {day.entries} {day.entries === 1 ? "session" : "sessions"} •{" "}
                                    {day.projects.join(", ")}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-2xl">{formatHours(day.hours)}</div>
                                <Badge variant="outline" className="text-xs">
                                  {day.hours >= 8 ? "Full Day" : day.hours >= 4 ? "Half Day" : "Partial"}
                                </Badge>
                              </div>
                            </div>

                            {/* Show individual time entries for the day */}
                            <div className="mt-3 space-y-1">
                              {day.timeEntries.map((entry, index) => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span>
                                      {formatTime(entry.start_time)} -{" "}
                                      {entry.end_time ? formatTime(entry.end_time) : "In Progress"}
                                    </span>
                                    <span className="text-gray-500">•</span>
                                    <span className="font-medium">{entry.project?.name || "Unknown Project"}</span>
                                  </div>
                                  <span className="font-medium">
                                    {formatHours((entry.duration_seconds || 0) / 3600)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity Timeline</CardTitle>
                    <CardDescription>Last 14 days of time tracking activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-12">
                        <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                        <p className="text-gray-500">No time entries in the last 14 days.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {recentActivity.map((day, index) => (
                          <div key={day.date} className="relative">
                            {index < recentActivity.length - 1 && (
                              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                            )}
                            <div className="flex items-start space-x-4">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  day.hours >= 8 ? "bg-green-100" : day.hours >= 4 ? "bg-yellow-100" : "bg-blue-100"
                                }`}
                              >
                                <Clock
                                  className={`w-5 h-5 ${
                                    day.hours >= 8
                                      ? "text-green-600"
                                      : day.hours >= 4
                                        ? "text-yellow-600"
                                        : "text-blue-600"
                                  }`}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <div className="font-medium text-lg">{formatDate(day.date)}</div>
                                    <div className="text-sm text-gray-500">
                                      {day.entries} {day.entries === 1 ? "session" : "sessions"} across{" "}
                                      {day.projects.length} {day.projects.length === 1 ? "project" : "projects"}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-xl">{formatHours(day.hours)}</div>
                                    <Badge variant={day.hours >= 8 ? "default" : "secondary"} className="text-xs">
                                      {day.hours >= 8 ? "Full Day" : day.hours >= 4 ? "Half Day" : "Partial"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <strong>Projects:</strong> {day.projects.join(", ")}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
