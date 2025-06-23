export interface Organization {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  organization_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  organization_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  employee_id?: string
  task_name: string
  task_description?: string
  status: "Open" | "Assigned" | "In Progress" | "Completed"
  time_spent?: number
  is_active: boolean
  created_at: string
  updated_at: string
  employee?: {
    first_name: string
    last_name: string
    email: string
  }
}

export interface TimeEntry {
  id: string
  employee_id: string
  project_id: string
  task_id: string
  start_time: string
  end_time?: string
  duration_seconds?: number
  description?: string
  ip_address?: string
  mac_address?: string
  created_at: string
  updated_at: string
}

export interface Screenshot {
  id: string
  time_entry_id: string
  employee_id: string
  file_url: string
  taken_at: string
  has_permissions: boolean
  created_at: string
}

export type UserType = "organization" | "employee"
