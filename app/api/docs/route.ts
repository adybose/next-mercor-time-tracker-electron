import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import yaml from "js-yaml"

export async function GET() {
  try {
    const swaggerPath = path.join(process.cwd(), "docs", "api-swagger.yaml")
    const swaggerContent = fs.readFileSync(swaggerPath, "utf8")
    const swaggerDoc = yaml.load(swaggerContent)

    return NextResponse.json(swaggerDoc)
  } catch (error) {
    console.error("Error loading Swagger doc:", error)
    return NextResponse.json({ error: "Failed to load API documentation" }, { status: 500 })
  }
}
