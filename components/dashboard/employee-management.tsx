"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, UserX, UserCheck, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Employee } from "@/lib/types"

interface EmployeeManagementProps {
  organizationId: string
}

export function EmployeeManagement({ organizationId }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [emailValidating, setEmailValidating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    first_name: "",
    last_name: "",
  })
  const [editEmployee, setEditEmployee] = useState({
    first_name: "",
    last_name: "",
  })

  useEffect(() => {
    fetchEmployees()
  }, [organizationId])

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/employees?organization_id=${organizationId}`)
      const data = await response.json()
      if (data.employees) {
        setEmployees(data.employees)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = async (email: string) => {
    if (!email || !email.includes("@")) return

    setEmailValidating(true)
    setMessage(null)

    try {
      const response = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          context: "employee_invite",
        }),
      })

      const data = await response.json()

      if (!data.available) {
        setMessage({
          type: "error",
          text: data.error,
        })
      } else {
        setMessage(null)
      }
    } catch (error) {
      console.error("Email validation error:", error)
      setMessage({
        type: "error",
        text: "Failed to validate email. Please try again.",
      })
    } finally {
      setEmailValidating(false)
    }
  }

  const handleEmailBlur = () => {
    if (newEmployee.email) {
      validateEmail(newEmployee.email)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: organizationId,
          ...newEmployee,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: data.message || "Employee invited successfully! They will receive an email to set up their account.",
        })
        setNewEmployee({ email: "", first_name: "", last_name: "" })
        setShowAddDialog(false)
        fetchEmployees()
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to invite employee",
        })
      }
    } catch (error) {
      console.error("Error adding employee:", error)
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setEditEmployee({
      first_name: employee.first_name,
      last_name: employee.last_name,
    })
    setShowEditDialog(true)
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return

    setUpdating(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editEmployee),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Employee details updated successfully!",
        })
        setShowEditDialog(false)
        setEditingEmployee(null)
        fetchEmployees()
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to update employee",
        })
      }
    } catch (error) {
      console.error("Error updating employee:", error)
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleSyncEmailVerification = async (employeeId: string) => {
    setSyncing(employeeId)
    try {
      const response = await fetch("/api/employees/sync-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_id: employeeId }),
      })

      if (response.ok) {
        fetchEmployees() // Refresh the list
        setMessage({
          type: "success",
          text: "Email verification status synced successfully",
        })
      } else {
        setMessage({
          type: "error",
          text: "Failed to sync email verification status",
        })
      }
    } catch (error) {
      console.error("Error syncing verification:", error)
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleToggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Employee ${!currentStatus ? "activated" : "deactivated"} successfully!`,
        })
        fetchEmployees()
      } else {
        setMessage({
          type: "error",
          text: `Failed to ${!currentStatus ? "activate" : "deactivate"} employee`,
        })
      }
    } catch (error) {
      console.error("Error toggling employee status:", error)
      setMessage({
        type: "error",
        text: "Network error. Please try again.",
      })
    }
  }

  if (loading) {
    return <div>Loading employees...</div>
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>Manage your organization's employees and their access</CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New Employee</DialogTitle>
                  <DialogDescription>
                    Send an invitation email to a new employee. They will receive a link to set up their account and
                    password.
                  </DialogDescription>
                </DialogHeader>

                {message && (
                  <Alert className={message.type === "error" ? "border-red-500" : "border-green-500"}>
                    {message.type === "error" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleAddEmployee} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newEmployee.first_name}
                      onChange={(e) => setNewEmployee((prev) => ({ ...prev, first_name: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newEmployee.last_name}
                      onChange={(e) => setNewEmployee((prev) => ({ ...prev, last_name: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
                      onBlur={handleEmailBlur}
                      required
                      disabled={submitting || emailValidating}
                    />
                    {emailValidating && <p className="text-xs text-muted-foreground">Checking email availability...</p>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || emailValidating || message?.type === "error"}>
                      {submitting ? "Sending Invitation..." : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className={`mb-4 ${message.type === "error" ? "border-red-500" : "border-green-500"}`}>
              {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={employee.email_verified ? "default" : "outline"}>
                        {employee.email_verified ? "Verified" : "Pending"}
                      </Badge>
                      {!employee.email_verified && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSyncEmailVerification(employee.id)}
                              disabled={syncing === employee.id}
                              className="h-6 w-6 p-0"
                            >
                              <RefreshCw className={`h-3 w-3 ${syncing === employee.id ? "animate-spin" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sync email verification status</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => handleEditEmployee(employee)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit employee details</p>
                        </TooltipContent>
                      </Tooltip>

                      {employee.is_active ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleEmployeeStatus(employee.id, employee.is_active)}
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Deactivate employee</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleEmployeeStatus(employee.id, employee.is_active)}
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Activate employee</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Edit Employee Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee Details</DialogTitle>
              <DialogDescription>
                Update the employee's name. Email address cannot be changed for security reasons.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_first_name">First Name</Label>
                <Input
                  id="edit_first_name"
                  value={editEmployee.first_name}
                  onChange={(e) => setEditEmployee((prev) => ({ ...prev, first_name: e.target.value }))}
                  required
                  disabled={updating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_last_name">Last Name</Label>
                <Input
                  id="edit_last_name"
                  value={editEmployee.last_name}
                  onChange={(e) => setEditEmployee((prev) => ({ ...prev, last_name: e.target.value }))}
                  required
                  disabled={updating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email Address</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editingEmployee?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email address cannot be changed</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={updating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Update Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Card>
    </TooltipProvider>
  )
}
