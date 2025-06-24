const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  takeScreenshot: () => ipcRenderer.invoke("take-screenshot-now"),
  startScreenshotMonitoring: () => ipcRenderer.invoke("start-screenshot-monitoring"),
  stopScreenshotMonitoring: () => ipcRenderer.invoke("stop-screenshot-monitoring"),
  deleteLocalFile: (filepath) => ipcRenderer.invoke("delete-local-file", filepath),
  onScreenshotTaken: (callback) => ipcRenderer.on("screenshot-taken", callback),
})
