"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import Swagger UI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false })

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        setSpec(data)
        setLoading(false)
      })
      .catch((err) => {
        setError("Failed to load API documentation")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading API Documentation...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Time Tracker API Documentation</h1>
        <p className="text-gray-600">Complete API reference for the Time Tracker application</p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Authentication</h3>
          <p className="text-blue-700 text-sm">
            Use <code className="bg-blue-100 px-1 rounded">POST /api/auth/login</code> to get your bearer token. Then
            add it to the Authorization header: <code className="bg-blue-100 px-1 rounded">Bearer YOUR_TOKEN</code>
          </p>
        </div>
      </div>

      {spec && <SwaggerUI spec={spec} docExpansion="list" defaultModelsExpandDepth={2} tryItOutEnabled={true} />}
    </div>
  )
}
