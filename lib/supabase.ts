import { createClient } from "./supabase/client"

// Export the supabase client for compatibility
export const supabase = createClient()

// Also export the createClient function
export { createClient }

// Re-export server client for server-side usage
export { createClient as createServerClient } from "./supabase/server"
