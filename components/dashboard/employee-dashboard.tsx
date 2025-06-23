"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const { data, error } = await supabase.from("employees").select("*").single() // Assuming you want to fetch data for a single employee

        if (error) {
          console.error("Error fetching employee data:", error)
        } else {
          setEmployeeData(data)
        }
      } catch (error) {
        console.error("Error during fetch:", error)
      }
    }

    fetchEmployeeData()
  }, [])

  if (!employeeData) {
    return <div>Loading employee data...</div>
  }

  return (
    <div>
      <h1>Employee Dashboard</h1>
      <p>Name: {employeeData.name}</p>
      <p>Email: {employeeData.email}</p>
      {/* Display other employee data here */}
    </div>
  )
}

export default EmployeeDashboard
