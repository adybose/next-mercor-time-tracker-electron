"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, Users, FolderOpen, Clock, BarChart3 } from "lucide-react"
import { EmployeeManagement } from "@/components/dashboard/employee-management"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { Organization } from "@/lib/types"
import { ProjectManagement } from "@/components/dashboard/project-management"
import { TimeTracking } from "@/components/dashboard/time-tracking"

interface OrganizationDashboardProps {
  organization: Organization
}

export function OrganizationDashboard({ organization }: OrganizationDashboardProps) {
  const [activeTab, setActiveTab] = useState("employees")
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-sm text-gray-600">Organization Dashboard</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="time-tracking" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Tracking
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
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

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>View detailed analytics and reports for your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Analytics features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
