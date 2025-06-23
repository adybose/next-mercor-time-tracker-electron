import { LogoutButton } from "./logout-button"

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  organization?: {
    company_name: string
  }
}

interface EmployeeDashboardProps {
  employee: Employee
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {employee.organization?.company_name || "Unknown Organization"} - Employee Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {employee.first_name} {employee.last_name}
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* Add more dashboard content here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Personal Information</h2>
          <p>
            <strong>Name:</strong> {employee.first_name} {employee.last_name}
          </p>
          <p>
            <strong>Email:</strong> {employee.email}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Organization</h2>
          <p>
            <strong>Company:</strong> {employee.organization?.company_name || "N/A"}
          </p>
        </div>

        {/* Example of another dashboard section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <ul>
            <li>
              <a href="#" className="text-blue-500 hover:underline">
                Update Profile
              </a>
            </li>
            <li>
              <a href="#" className="text-blue-500 hover:underline">
                View Documents
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
