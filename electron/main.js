const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron")
const isDev = require("electron-is-dev")
const path = require("path")
const fs = require("fs").promises
const os = require("os")

let mainWindow
let screenshotInterval

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  // Load the Next.js dev server or built app
  const startUrl = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "../out/index.html")}`

  mainWindow.loadURL(startUrl)

  // Start screenshot monitoring when window is ready
  mainWindow.webContents.once("did-finish-load", () => {
    startScreenshotMonitoring()
  })
}

async function takeScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    })

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail
      const buffer = screenshot.toPNG()

      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(os.tmpdir(), "time-tracker-screenshots")
      try {
        await fs.access(screenshotsDir)
      } catch {
        await fs.mkdir(screenshotsDir, { recursive: true })
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const filename = `screenshot-${timestamp}.png`
      const filepath = path.join(screenshotsDir, filename)

      // Save screenshot locally
      await fs.writeFile(filepath, buffer)

      console.log("Screenshot saved:", filepath)

      // Notify renderer process to upload the screenshot
      mainWindow.webContents.send("screenshot-taken", {
        filepath,
        filename,
        timestamp: new Date().toISOString(),
      })

      return { success: true, filepath, filename }
    }
  } catch (error) {
    console.error("Error taking screenshot:", error)
    return { success: false, error: error.message }
  }
}

function startScreenshotMonitoring() {
  // Take screenshot every 10 minutes (600,000 ms)
  screenshotInterval = setInterval(
    async () => {
      await takeScreenshot()
    },
    10 * 60 * 1000,
  )

  console.log("Screenshot monitoring started - capturing every 10 minutes")
}

function stopScreenshotMonitoring() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval)
    screenshotInterval = null
    console.log("Screenshot monitoring stopped")
  }
}

// IPC handlers
ipcMain.handle("take-screenshot-now", async () => {
  return await takeScreenshot()
})

ipcMain.handle("start-screenshot-monitoring", () => {
  startScreenshotMonitoring()
  return { success: true }
})

ipcMain.handle("stop-screenshot-monitoring", () => {
  stopScreenshotMonitoring()
  return { success: true }
})

ipcMain.handle("delete-local-file", async (event, filepath) => {
  try {
    await fs.unlink(filepath)
    console.log("Local file deleted:", filepath)
    return { success: true }
  } catch (error) {
    console.error("Error deleting local file:", error)
    return { success: false, error: error.message }
  }
})

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  stopScreenshotMonitoring()
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", () => {
  stopScreenshotMonitoring()
})
