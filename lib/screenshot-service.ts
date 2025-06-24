import { createClient } from "@/lib/supabase/client"

export interface ScreenshotData {
  filepath: string
  filename: string
  timestamp: string
}

export class ScreenshotService {
  private supabase = createClient()

  async uploadScreenshot(screenshotData: ScreenshotData, timeEntryId?: string): Promise<boolean> {
    try {
      // Read the file from local path (in Electron context)
      const response = await fetch(`file://${screenshotData.filepath}`)
      const buffer = await response.arrayBuffer()
      const file = new File([buffer], screenshotData.filename, { type: "image/png" })

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from("mercor-screenshots-bucket")
        .upload(`${Date.now()}-${screenshotData.filename}`, file)

      if (uploadError) {
        console.error("Error uploading to Supabase:", uploadError)
        return false
      }

      // Get the public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from("mercor-screenshots-bucket").getPublicUrl(uploadData.path)

      // Save screenshot record to database if we have a time entry
      if (timeEntryId) {
        const { error: dbError } = await this.supabase.from("mercor-screenshots-bucket").insert({
          time_entry_id: timeEntryId,
          file_url: publicUrl,
          taken_at: screenshotData.timestamp,
          has_permissions: true,
        })

        if (dbError) {
          console.error("Error saving screenshot record:", dbError)
          // Don't return false here as the upload was successful
        }
      }

      console.log("Screenshot uploaded successfully:", publicUrl)
      return true
    } catch (error) {
      console.error("Error in uploadScreenshot:", error)
      return false
    }
  }

  async handleScreenshotUpload(screenshotData: ScreenshotData, timeEntryId?: string): Promise<void> {
    try {
      // Upload the screenshot
      const uploadSuccess = await this.uploadScreenshot(screenshotData, timeEntryId)

      if (uploadSuccess) {
        // Delete local file after successful upload
        if (window.electronAPI) {
          const deleteResult = await window.electronAPI.deleteLocalFile(screenshotData.filepath)
          if (!deleteResult.success) {
            console.error("Failed to delete local file:", deleteResult.error)
          }
        }
      } else {
        console.error("Screenshot upload failed, keeping local file")
      }
    } catch (error) {
      console.error("Error handling screenshot upload:", error)
    }
  }
}
