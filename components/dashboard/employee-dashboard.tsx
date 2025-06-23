"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { EmployeeTimeTracking } from "./employee-time-tracking"

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  organization_id?: string
}

interface EmployeeDashboardProps {
  employee: Employee
}

interface DashboardStats {
  totalHoursLogged: number
  activeProjects: number
  assignedTasks: number
  completedTasks: number
  companyName: string | null
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch organization name
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("company_name")
        .eq("id", employee.organization_id)
        .single()

      if (orgError) {
        console.error("Error fetching organization:", orgError)
        throw orgError
      }

      // Fetch tasks assigned to the employee
      const { data: tasks, error: tasksError } = await supabase.from("tasks").select("*").eq("assignee_id", employee.id)

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError)
        throw tasksError
      }

      const assignedTasks = tasks?.length || 0
      const completedTasks = tasks?.filter((task) => task.status === "completed").length || 0

      // Fetch time entries for calculating hours
      const { data: timeEntries, error: timeError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", employee.id)

      if (timeError) {
        console.error("Error fetching time entries:", timeError)
        throw timeError
      }

      // Calculate total hours logged
      const totalHoursLogged = timeEntries?.reduce((acc, entry) => acc + entry.hours, 0) || 0

      // Fetch active projects (assuming you have a way to determine active projects)
      // This is just a placeholder, replace with your actual logic
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", employee.organization_id)
        .eq("status", "active")

      if (projectsError) {
        console.error("Error fetching projects:", projectsError)
        throw projectsError
      }

      const activeProjects = projects?.length || 0

      setDashboardStats({
        totalHoursLogged,
        activeProjects,
        assignedTasks,
        completedTasks,
        companyName: organization?.company_name || "N/A",
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (employee.id) {
      fetchDashboardStats()
    }
  }, [employee.id, employee.organization_id])

  const handleLogout = () => {
    window.location.href = "/logout"
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {dashboardStats?.companyName || "Unknown Organization"} - Employee Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {employee.first_name} {employee.last_name}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Hours Logged</h2>
          <p className="text-3xl font-bold">{dashboardStats?.totalHoursLogged || 0}</p>
          <p className="text-muted-foreground">Total hours logged this month</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Active Projects</h2>
          <p className="text-3xl font-bold">{dashboardStats?.activeProjects || 0}</p>
          <p className="text-muted-foreground">Projects currently active</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Assigned Tasks</h2>
          <p className="text-3xl font-bold">{dashboardStats?.assignedTasks || 0}</p>
          <p className="text-muted-foreground">Tasks assigned to you</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Completed Tasks</h2>
          <p className="text-3xl font-bold">{dashboardStats?.completedTasks || 0}</p>
          <p className="text-muted-foreground">Tasks completed this month</p>
        </div>
      </div>

      <EmployeeTimeTracking employeeId={employee.id} />
    </div>
  )
}
