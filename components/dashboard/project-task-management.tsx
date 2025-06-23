"use client"

import { DialogTrigger } from "@/components/ui/dialog"

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
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Edit, Clock, User, CheckSquare } from "lucide-react"
import type { Task, Employee } from "@/lib/types"

interface ProjectTaskManagementProps {
  projectId: string
  organizationId: string
}

export function ProjectTaskManagement({ projectId, organizationId }: ProjectTaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [originalEmployeeId, setOriginalEmployeeId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    task_name: "",
    task_description: "",
    employee_id: "",
  })
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [projectId, organizationId])

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?project_id=${projectId}`)
      const data = await response.json()

      if (response.ok) {
        setTasks(data.tasks || [])
      } else {
        throw new Error(data.error || "Failed to fetch tasks")
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setAlert({ type: "error", message: "Failed to load tasks" })
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?organization_id=${organizationId}`)
      const data = await response.json()

      if (response.ok) {
        setEmployees(data.employees?.filter((emp: Employee) => emp.is_active) || [])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.task_name.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          task_name: newTask.task_name.trim(),
          task_description: newTask.task_description.trim(),
          employee_id: newTask.employee_id || null, // Allow null for unassigned tasks
        }),
      })

      const data = await response.json()

      if (response.ok && data.task) {
        setTasks([data.task, ...tasks])
        setNewTask({ task_name: "", task_description: "", employee_id: "" })
        setShowCreateDialog(false)
        const message = newTask.employee_id ? "Task created and assigned successfully!" : "Task created successfully!"
        setAlert({ type: "success", message })
      } else {
        throw new Error(data.error || "Failed to create task")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      setAlert({ type: "error", message: "Failed to create task" })
    } finally {
      setCreating(false)
    }
  }

  const handleEditClick = (task: Task) => {
    console.log("Edit clicked for task:", task)
    setEditingTask({ ...task })
    setOriginalEmployeeId(task.employee_id || null)
    setShowEditDialog(true)
  }

  const handleEmployeeChange = (newEmployeeId: string) => {
    if (!editingTask) return

    let newStatus: Task["status"]
    let actualEmployeeId: string | undefined

    if (newEmployeeId === "unassigned") {
      newStatus = "Open"
      actualEmployeeId = undefined
    } else {
      // Always set to "Assigned" when an employee is assigned
      newStatus = "Assigned"
      actualEmployeeId = newEmployeeId
    }

    const updatedTask = {
      ...editingTask,
      employee_id: actualEmployeeId,
      status: newStatus,
    }

    setEditingTask(updatedTask)
  }

  const handleStatusChange = (newStatus: Task["status"]) => {
    if (!editingTask) return

    const updatedTask = { ...editingTask, status: newStatus }

    // If changing status to "Open", unassign the employee
    if (newStatus === "Open") {
      updatedTask.employee_id = undefined
    }

    setEditingTask(updatedTask)
  }

  const handleEditTask = async () => {
    if (!editingTask || !editingTask.task_name?.trim()) return

    setUpdating(true)
    try {
      const updatePayload = {
        id: editingTask.id,
        task_name: editingTask.task_name,
        task_description: editingTask.task_description || "",
        employee_id: editingTask.employee_id || null,
        status: editingTask.status,
      }

      console.log("Updating task with payload:", updatePayload)

      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      })

      const data = await response.json()

      if (response.ok && data.task) {
        setTasks(tasks.map((task) => (task.id === editingTask.id ? data.task : task)))
        setShowEditDialog(false)
        setEditingTask(null)
        setOriginalEmployeeId(null)
        setAlert({ type: "success", message: "Task updated successfully!" })
      } else {
        throw new Error(data.error || "Failed to update task")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to update task" })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "secondary"
      case "Assigned":
        return "default"
      case "In Progress":
        return "default"
      case "Completed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "text-gray-600"
      case "Assigned":
        return "text-blue-600"
      case "In Progress":
        return "text-orange-600"
      case "Completed":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const canEditTask = (task: Task) => {
    // Can edit all tasks except "Completed"
    return task.status !== "Completed"
  }

  const getEditTooltip = (task: Task) => {
    if (task.status === "Completed") {
      return "Completed tasks cannot be edited"
    }
    return "Edit task details"
  }

  const handleEditDialogClose = () => {
    setShowEditDialog(false)
    setEditingTask(null)
    setOriginalEmployeeId(null)
  }

  const getAvailableStatuses = () => {
    if (!editingTask) return []

    const currentStatus = editingTask.status
    const hasEmployee = !!editingTask.employee_id

    // If no employee assigned, only "Open" is available
    if (!hasEmployee) {
      return ["Open"]
    }

    // Restrictive status transitions
    switch (currentStatus) {
      case "Assigned":
        return ["Assigned", "In Progress"] // Can only move to In Progress
      case "In Progress":
        return ["In Progress", "Completed"] // Can only move to Completed
      case "Completed":
        return ["Completed"] // Cannot change completed tasks
      case "Open":
        return ["Open"] // Should not reach here with employee assigned
      default:
        return ["Assigned"]
    }
  }

  const isStatusFieldDisabled = () => {
    if (!editingTask) return true

    // Status field is disabled if:
    // 1. No employee is assigned (must be "Open")
    // 2. Status is "Assigned" (locked until moved to "In Progress")
    // 3. Status is "Completed" (cannot be changed)
    return !editingTask.employee_id || editingTask.status === "Assigned" || editingTask.status === "Completed"
  }

  const getStatusFieldHelperText = () => {
    if (!editingTask) return ""

    if (!editingTask.employee_id) {
      return "Assign an employee to change status"
    }

    switch (editingTask.status) {
      case "Assigned":
        return "Status locked to 'Assigned' - change to 'In Progress' to continue workflow"
      case "In Progress":
        return "Can only change to 'Completed'"
      case "Completed":
        return "Completed tasks cannot be modified"
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5" />
                <span>Tasks ({tasks.length})</span>
              </CardTitle>
              <CardDescription>Manage project tasks and assignments</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task. You can assign it to an employee now or leave it unassigned.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTask}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-name">Task Name *</Label>
                      <Input
                        id="task-name"
                        placeholder="Enter task name"
                        value={newTask.task_name}
                        onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task-description">Task Description</Label>
                      <Textarea
                        id="task-description"
                        placeholder="Enter task description (optional)"
                        value={newTask.task_description}
                        onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee">Assign to Employee (Optional)</Label>
                      <Select
                        value={newTask.employee_id}
                        onValueChange={(value) =>
                          setNewTask({ ...newTask, employee_id: value === "unassigned" ? "" : value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee or leave unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Leave Unassigned</SelectItem>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.first_name} {employee.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {newTask.employee_id ? "Task will be marked as 'Assigned'" : "Task will be marked as 'Open'"}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating || !newTask.task_name.trim()}>
                      {creating ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Alert Messages */}
          {alert && (
            <Alert
              className={`mb-4 ${alert.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
            >
              <AlertDescription className={alert.type === "error" ? "text-red-800" : "text-green-800"}>
                {alert.message}
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8">Loading tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first task to start organizing work for this project.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.task_name}</div>
                        {task.task_description && (
                          <div className="text-sm text-muted-foreground max-w-xs truncate">{task.task_description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.employee ? (
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {task.employee.first_name} {task.employee.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(task.status)} className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canEditTask(task)}
                              onClick={() => handleEditClick(task)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{getEditTooltip(task)}</TooltipContent>
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

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details, assign/unassign employee, or change status.</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task Name *</Label>
                <Input
                  value={editingTask.task_name || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, task_name: e.target.value })}
                  placeholder="Enter task name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTask.task_description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, task_description: e.target.value })}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign to Employee</Label>
                <Select value={editingTask.employee_id || "unassigned"} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingTask.status}
                  onValueChange={handleStatusChange}
                  disabled={isStatusFieldDisabled()}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses().map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getStatusFieldHelperText() && (
                  <p className="text-xs text-muted-foreground text-blue-600">{getStatusFieldHelperText()}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleEditDialogClose}>
              Cancel
            </Button>
            <Button disabled={updating || !editingTask?.task_name?.trim()} onClick={handleEditTask}>
              {updating ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
