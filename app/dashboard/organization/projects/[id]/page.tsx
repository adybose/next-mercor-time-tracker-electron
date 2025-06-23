"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CheckSquare } from "lucide-react"
import { ProjectTaskManagement } from "@/components/dashboard/project-task-management"
import type { Project } from "@/lib/types"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      const data = await response.json()

      if (response.ok) {
        setProject(data.project)
      } else {
        throw new Error(data.error || "Failed to fetch project")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
      setError("Failed to load project details")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/dashboard/organization?tab=projects")
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading project details...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error || "Project not found"}</AlertDescription>
        </Alert>
        <Button onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">Project Details & Task Management</p>
          </div>
        </div>
        <Badge variant={project.is_active ? "default" : "secondary"}>{project.is_active ? "Active" : "Inactive"}</Badge>
      </div>

      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5" />
            <span>Project Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Project Name</h3>
              <p className="text-lg">{project.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
              <Badge variant={project.is_active ? "default" : "secondary"}>
                {project.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-medium text-sm text-muted-foreground">Description</h3>
              <p className="text-sm">{project.description || "No description provided"}</p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground">Created</h3>
              <p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Management */}
      <ProjectTaskManagement projectId={projectId} organizationId={project.organization_id} />
    </div>
  )
}
