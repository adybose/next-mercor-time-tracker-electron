"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Calendar, FolderOpen, Edit } from "lucide-react"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  organization_id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ProjectWithStats extends Project {
  employee_count?: number
  task_count?: number
}

const ProjectManagement = ({ organizationId }: { organizationId: string }) => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", description: "" })
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [organizationId])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects?organization_id=${organizationId}`)
      const data = await response.json()

      if (response.ok) {
        setProjects(data.projects || [])
      } else {
        throw new Error(data.error || "Failed to fetch projects")
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
      setAlert({ type: "error", message: "Failed to load projects" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.name.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          name: newProject.name.trim(),
          description: newProject.description.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.project) {
        setProjects([data.project, ...projects])
        setNewProject({ name: "", description: "" })
        setShowCreateDialog(false)
        setAlert({ type: "success", message: "Project created successfully!" })
      } else {
        throw new Error(data.error || "Failed to create project")
      }
    } catch (error) {
      console.error("Error creating project:", error)
      setAlert({ type: "error", message: "Failed to create project" })
    } finally {
      setCreating(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard/organization/projects/${projectId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Project Management</h2>
            <p className="text-muted-foreground">Manage your organization's projects</p>
          </div>
        </div>
        <div className="text-center py-8">Loading projects...</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Project Management</h2>
            <p className="text-muted-foreground">Manage your organization's projects and tasks</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Add a new project to your organization. You can assign employees and create tasks later.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProject}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name *</Label>
                    <Input
                      id="project-name"
                      placeholder="Enter project name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      placeholder="Enter project description (optional)"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newProject.name.trim()}>
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alert Messages */}
        {alert && (
          <Alert className={alert.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <AlertDescription className={alert.type === "error" ? "text-red-800" : "text-green-800"}>
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects ({projects.length})</CardTitle>
            <CardDescription>Click on any project to view details, manage tasks, and assign employees</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first project to start organizing work and assigning tasks.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{project.description || "No description"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={project.is_active ? "default" : "secondary"}>
                          {project.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProjectClick(project.id)
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View project details</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

export { ProjectManagement }
