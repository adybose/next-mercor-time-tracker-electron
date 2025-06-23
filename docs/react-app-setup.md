# React.js Client Setup Guide

## Overview
This guide explains how to create a React.js application that consumes the Time Tracker Next.js APIs.

## Environment Variables

Create a `.env` file in your React app root:

\`\`\`env
# API Configuration
REACT_APP_API_BASE_URL=https://your-nextjs-app.vercel.app
# or for development: http://localhost:3000

# Supabase Configuration (for authentication)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: For development
REACT_APP_ENVIRONMENT=development
\`\`\`

## Required Environment Variables

### 1. REACT_APP_API_BASE_URL
- **Purpose**: Base URL for all API calls to your Next.js backend
- **Production**: `https://your-nextjs-app.vercel.app`
- **Development**: `http://localhost:3000`

### 2. REACT_APP_SUPABASE_URL
- **Purpose**: Supabase project URL for authentication
- **Format**: `https://your-project-id.supabase.co`
- **Where to find**: Supabase Dashboard > Settings > API

### 3. REACT_APP_SUPABASE_ANON_KEY
- **Purpose**: Supabase anonymous key for client-side authentication
- **Where to find**: Supabase Dashboard > Settings > API > Project API keys

## Authentication Flow

### 1. Login and Get JWT Token

\`\`\`javascript
// utils/auth.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  
  // Store the JWT token
  const token = data.session.access_token
  localStorage.setItem('jwt_token', token)
  localStorage.setItem('user', JSON.stringify(data.user))
  
  return { token, user: data.user }
}

export const logout = async () => {
  await supabase.auth.signOut()
  localStorage.removeItem('jwt_token')
  localStorage.removeItem('user')
}

export const getToken = () => {
  return localStorage.getItem('jwt_token')
}

export const getCurrentUser = () => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}
\`\`\`

### 2. API Client Setup

\`\`\`javascript
// utils/apiClient.js
import axios from 'axios'
import { getToken } from './auth'

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('jwt_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
\`\`\`

### 3. API Service Functions

\`\`\`javascript
// services/employeeService.js
import apiClient from '../utils/apiClient'

export const employeeService = {
  // Get all employees for organization
  getEmployees: async (organizationId) => {
    const response = await apiClient.get(`/api/employees?organization_id=${organizationId}`)
    return response.data
  },

  // Create new employee
  createEmployee: async (employeeData) => {
    const response = await apiClient.post('/api/employees', employeeData)
    return response.data
  },

  // Get employee by ID
  getEmployee: async (id) => {
    const response = await apiClient.get(`/api/employees/${id}`)
    return response.data
  },

  // Update employee
  updateEmployee: async (id, updateData) => {
    const response = await apiClient.put(`/api/employees/${id}`, updateData)
    return response.data
  },

  // Delete employee
  deleteEmployee: async (id) => {
    const response = await apiClient.delete(`/api/employees/${id}`)
    return response.data
  }
}
\`\`\`

\`\`\`javascript
// services/timeTrackingService.js
import apiClient from '../utils/apiClient'

export const timeTrackingService = {
  // Start time tracking
  startTracking: async (taskId, description, ipAddress, macAddress) => {
    const response = await apiClient.post('/api/time-tracking/start', {
      task_id: taskId,
      description,
      ip_address: ipAddress,
      mac_address: macAddress
    })
    return response.data
  },

  // Pause time tracking
  pauseTracking: async (taskId) => {
    const response = await apiClient.post('/api/time-tracking/pause', {
      task_id: taskId
    })
    return response.data
  },

  // Resume time tracking
  resumeTracking: async (taskId, ipAddress, macAddress) => {
    const response = await apiClient.post('/api/time-tracking/resume', {
      task_id: taskId,
      ip_address: ipAddress,
      mac_address: macAddress
    })
    return response.data
  },

  // Complete time tracking
  completeTracking: async (taskId) => {
    const response = await apiClient.post('/api/time-tracking/complete', {
      task_id: taskId
    })
    return response.data
  },

  // Get time tracking status
  getStatus: async (taskId, employeeId) => {
    const params = new URLSearchParams()
    if (taskId) params.append('task_id', taskId)
    if (employeeId) params.append('employee_id', employeeId)
    
    const response = await apiClient.get(`/api/time-tracking/status?${params}`)
    return response.data
  },

  // Get time tracking summary
  getSummary: async (organizationId) => {
    const response = await apiClient.get(`/api/time-tracking/summary?organization_id=${organizationId}`)
    return response.data
  },

  // Refresh time data
  refreshData: async (organizationId) => {
    const response = await apiClient.post('/api/time-tracking/refresh', {
      organization_id: organizationId
    })
    return response.data
  }
}
\`\`\`

## Sample React Components

### 1. Login Component

\`\`\`jsx
// components/Login.jsx
import React, { useState } from 'react'
import { login } from '../utils/auth'

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { token, user } = await login(email, password)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}

export default Login
\`\`\`

### 2. Employee Dashboard Component

\`\`\`jsx
// components/EmployeeDashboard.jsx
import React, { useState, useEffect } from 'react'
import { employeeService } from '../services/employeeService'
import { timeTrackingService } from '../services/timeTrackingService'

const EmployeeDashboard = ({ user }) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const data = await timeTrackingService.getStatus(null, user.id)
      setTasks(data.time_entries)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const startTask = async (taskId) => {
    try {
      await timeTrackingService.startTracking(taskId, 'Task started')
      loadTasks() // Refresh data
    } catch (error) {
      console.error('Error starting task:', error)
    }
  }

  const pauseTask = async (taskId) => {
    try {
      await timeTrackingService.pauseTracking(taskId)
      loadTasks() // Refresh data
    } catch (error) {
      console.error('Error pausing task:', error)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Employee Dashboard</h1>
      <div>
        <h2>Your Tasks</h2>
        {tasks.map(task => (
          <div key={task.id}>
            <h3>{task.tasks.task_name}</h3>
            <p>Status: {task.status}</p>
            <p>Duration: {task.duration_seconds || 0} seconds</p>
            <button onClick={() => startTask(task.task_id)}>
              Start
            </button>
            <button onClick={() => pauseTask(task.task_id)}>
              Pause
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EmployeeDashboard
\`\`\`

## Package Dependencies

\`\`\`json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0"
  }
}
\`\`\`

## Installation Steps

1. **Create React App**:
   \`\`\`bash
   npx create-react-app time-tracker-client
   cd time-tracker-client
   \`\`\`

2. **Install Dependencies**:
   \`\`\`bash
   npm install @supabase/supabase-js axios react-router-dom
   \`\`\`

3. **Set up Environment Variables**:
   Create `.env` file with the variables listed above

4. **Import Postman Collection**:
   - Open Postman
   - Click Import
   - Upload the `postman-collection.json` file
   - Set up environment variables in Postman

5. **Test Authentication**:
   - Use the "Get JWT Token" request in Postman
   - Copy the token to use in other requests

## Security Considerations

1. **Token Storage**: Store JWT tokens securely (consider using httpOnly cookies in production)
2. **Token Refresh**: Implement token refresh logic for long-lived sessions
3. **CORS**: Ensure your Next.js app allows requests from your React app domain
4. **Environment Variables**: Never commit sensitive keys to version control
5. **HTTPS**: Always use HTTPS in production

## Testing the Setup

1. **Authentication Test**: Try logging in and verify token is received
2. **API Test**: Make a simple API call (like getting employees)
3. **Error Handling**: Test with invalid tokens to ensure proper error handling
4. **Real-time Updates**: Test time tracking functionality

This setup provides a complete foundation for building a React.js client that consumes your Time Tracker APIs!
