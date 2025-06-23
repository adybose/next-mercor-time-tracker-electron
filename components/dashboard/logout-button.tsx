"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    router.push("/auth/logout")
  }

  return (
    <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
      <LogOut className="w-4 h-4" />
      Logout
    </Button>
  )
}
