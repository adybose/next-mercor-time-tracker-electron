"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Eye, Users, FolderOpen, TrendingUp, RefreshCw } from "lucide-react"
import { EmployeeTimeDetailsModal } from "./employee-time-details-modal"
import type { Employee, Project } from "@/lib/types"

interface TimeTrackingProps {
  organizationId: string
}

interface EmployeeTimeData {
  employee: Employee
  project?: Project
  hoursAllTime: number
  hoursLastWeek: number
  hoursToday: number
  totalEntries: number
}

interface EmployeeProjectRelationship {
  employeeId: string
  projectId: string
  projectName: string
}

export function TimeTracking({ organizationId }: TimeTrackingProps) {
  const [employeeTimeData, setEmployeeTimeData] = useState<EmployeeTimeData[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employeeProjectRelationships, setEmployeeProjectRelationships] = useState<EmployeeProjectRelationship[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<Employee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [organizationId])

  useEffect(() => {
    applySmartFiltering()
  }, [selectedEmployee, selectedProject, employees, projects, employeeProjectRelationships])

  const fetchData = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/time-tracking/summary?organization_id=${organizationId}`)
      const data = await response.json()

      if (data.employeeTimeData) setEmployeeTimeData(data.employeeTimeData)
      if (data.employees) setEmployees(data.employees)
      if (data.projects) setProjects(data.projects)
      if (data.employeeProjectRelationships) setEmployeeProjectRelationships(data.employeeProjectRelationships)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const applySmartFiltering = () => {
    let newFilteredEmployees = [...employees]
    let newFilteredProjects = [...projects]

    if (selectedProject !== "all") {
      // Filter employees who are assigned to tasks in the selected project
      const projectEmployeeIds = employeeProjectRelationships
        .filter((rel) => rel.projectId === selectedProject)
        .map((rel) => rel.employeeId)

      newFilteredEmployees = employees.filter((emp) => projectEmployeeIds.includes(emp.id))
    }

    if (selectedEmployee !== "all") {
      // Filter projects that the selected employee is assigned to (through tasks)
      const employeeProjectIds = employeeProjectRelationships
        .filter((rel) => rel.employeeId === selectedEmployee)
        .map((rel) => rel.projectId)

      newFilteredProjects = projects.filter((proj) => employeeProjectIds.includes(proj.id))
    }

    setFilteredEmployees(newFilteredEmployees)
    setFilteredProjects(newFilteredProjects)
  }

  const getFilteredTimeData = () => {
    let filtered = employeeTimeData

    if (selectedEmployee !== "all") {
      filtered = filtered.filter((data) => data.employee.id === selectedEmployee)
    }

    if (selectedProject !== "all") {
      filtered = filtered.filter((data) => data.project?.id === selectedProject)
    }

    return filtered
  }

  const getTotalHours = (type: "allTime" | "lastWeek" | "today") => {
    const filtered = getFilteredTimeData()
    return filtered.reduce((total, data) => {
      switch (type) {
        case "allTime":
          return total + data.hoursAllTime
        case "lastWeek":
          return total + data.hoursLastWeek
        case "today":
          return total + data.hoursToday
        default:
          return total
      }
    }, 0)
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployeeForModal(employee)
    setIsModalOpen(true)
  }

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployee(value)
    if (value !== "all") {
      setSelectedProject("all") // Reset project filter when employee is selected
    }
  }

  const handleProjectChange = (value: string) => {
    setSelectedProject(value)
    if (value !== "all") {
      setSelectedEmployee("all") // Reset employee filter when project is selected
    }
  }

  const clearFilters = () => {
    setSelectedEmployee("all")
    setSelectedProject("all")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-gray-500">Loading time tracking data...</p>
        </div>
      </div>
    )
  }

  const filteredTimeData = getFilteredTimeData()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(getTotalHours("today"))}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTimeData.filter((d) => d.hoursToday > 0).length} employees active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Last Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(getTotalHours("lastWeek"))}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTimeData.filter((d) => d.hoursLastWeek > 0).length} employees active last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours All Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(getTotalHours("allTime"))}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTimeData.reduce((sum, d) => sum + d.totalEntries, 0)} total entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTimeData.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTimeData.filter((d) => d.hoursAllTime > 0).length} with logged hours
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {filteredEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject !== "all" && (
                <p className="text-xs text-blue-600">Showing employees assigned to selected project</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select value={selectedProject} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee !== "all" && (
                <p className="text-xs text-blue-600">Showing projects assigned to selected employee</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Time Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Time Entries</CardTitle>
          <CardDescription>
            {selectedEmployee !== "all" || selectedProject !== "all"
              ? `Filtered results (${filteredTimeData.length} employee-project combinations)`
              : `All employee time entries (${filteredTimeData.length} employee-project combinations)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTimeData.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries found</h3>
              <p className="text-gray-500 mb-4">
                {selectedEmployee !== "all" || selectedProject !== "all"
                  ? "No time entries match the selected filters."
                  : "No employees have logged time yet."}
              </p>
              {(selectedEmployee !== "all" || selectedProject !== "all") && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Employee</TableHead>
                    <TableHead className="min-w-[150px]">Project</TableHead>
                    <TableHead className="text-right">All Time</TableHead>
                    <TableHead className="text-right">Last Week</TableHead>
                    <TableHead className="text-right">Today</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimeData.map((data, index) => (
                    <TableRow key={`${data.employee.id}-${data.project?.id || "no-project"}-${index}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-white">
                              {data.employee.first_name[0]}
                              {data.employee.last_name[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">
                              {data.employee.first_name} {data.employee.last_name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">{data.employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{data.project?.name || "No Project Assigned"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-bold text-lg">{formatHours(data.hoursAllTime)}</div>
                        <div className="text-xs text-gray-500">{data.totalEntries} entries</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatHours(data.hoursLastWeek)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatHours(data.hoursToday)}</div>
                        {data.hoursToday > 0 && <div className="text-xs text-green-600">Active today</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={data.employee.is_active ? "default" : "secondary"}>
                          {data.employee.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(data.employee)}
                          className="hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Time Details Modal */}
      <EmployeeTimeDetailsModal
        employee={selectedEmployeeForModal}
        organizationId={organizationId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedEmployeeForModal(null)
        }}
      />
    </div>
  )
}
