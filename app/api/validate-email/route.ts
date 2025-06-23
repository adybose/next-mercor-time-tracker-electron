import { type NextRequest, NextResponse } from "next/server"
import { checkEmailExists } from "@/lib/email-validation"

export async function POST(request: NextRequest) {
  try {
    const { email, context } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const emailCheck = await checkEmailExists(email)

    if (!emailCheck.exists) {
      return NextResponse.json({ available: true })
    }

    // Email exists, provide context-specific error messages
    let errorMessage = ""

    if (context === "organization_signup") {
      if (emailCheck.userType === "organization") {
        errorMessage =
          "An organization account already exists with this email address. Please use a different email or try logging in."
      } else if (emailCheck.userType === "employee") {
        errorMessage = "This email is already registered as an employee account. Please use a different email address."
      } else {
        errorMessage = "An account already exists with this email address. Please use a different email."
      }
    } else if (context === "employee_invite") {
      if (emailCheck.userType === "organization") {
        errorMessage =
          "This email is already registered as an organization account. Please use a different email address."
      } else if (emailCheck.userType === "employee") {
        errorMessage = "This email is already registered as an employee. Please use a different email address."
      } else {
        errorMessage = "An account already exists with this email address. Please use a different email."
      }
    }

    return NextResponse.json({
      available: false,
      error: errorMessage,
      userType: emailCheck.userType,
    })
  } catch (error: any) {
    console.error("Email validation error:", error)
    return NextResponse.json({ error: "Failed to validate email" }, { status: 500 })
  }
}
