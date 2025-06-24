export interface ElectronAPI {
  takeScreenshot: () => Promise<{ success: boolean; filepath?: string; filename?: string; error?: string }>
  startScreenshotMonitoring: () => Promise<{ success: boolean }>
  stopScreenshotMonitoring: () => Promise<{ success: boolean }>
  deleteLocalFile: (filepath: string) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (event: any, data: { filepath: string; filename: string; timestamp: string }) => void,
  ) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
