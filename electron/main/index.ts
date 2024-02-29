import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  Menu,
  MenuItem,
} from "electron";
import { release } from "node:os";
import { join } from "node:path";
import { update } from "./update";
import Store from "electron-store";
import * as path from "path";
import { StoreKeys, StoreSchema } from "./Store/storeConfig";
// import contextMenus from "./contextMenus";
import * as lancedb from "vectordb";
import * as fs from "fs";
import {
  startWatchingDirectory,
  updateFileListForRenderer,
} from "./Files/Filesystem";
import { registerLLMSessionHandlers } from "./llm/llmSessionHandlers";
// import { FileInfoNode } from "./Files/Types";
import { registerDBSessionHandlers } from "./database/dbSessionHandlers";
import {
  getDefaultEmbeddingModelConfig,
  registerStoreHandlers,
} from "./Store/storeHandlers";
import { registerFileHandlers } from "./Files/registerFilesHandler";
import { RepopulateTableWithMissingItems } from "./database/TableHelperFunctions";
import {
  getVaultDirectoryForContents,
  getWindowInfoForContents,
  activeWindows,
  getNextWindowPosition,
  getWindowSize,
} from "./windowManager";
import { errorToString } from "./Generic/error";

const store = new Store<StoreSchema>();
// store.clear(); // clear store for testing

process.env.DIST_ELECTRON = join(__dirname, "../");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

let dbConnection: lancedb.Connection;

async function createWindow() {
  const { x, y } = getNextWindowPosition();
  const { width, height } = getWindowSize();
  const win = new BrowserWindow({
    title: "Reor",
    x: x,
    y: y,
    webPreferences: {
      preload,
    },
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#2f3241",
      symbolColor: "#74b1be",
      height: 30,
    },
    width: width,
    height: height,
  });

  if (url) {
    // electron-vite-vue#298
    win.loadURL(url);
    // Open devTool if the app is not packaged
    win.webContents.openDevTools();
  } else {
    win.loadFile(indexHtml);
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("close", () => {
    // Get the directory for this window's contents
    const directoryToSave = getVaultDirectoryForContents(
      activeWindows,
      win.webContents
    );

    // Save the directory if found
    if (directoryToSave) {
      console.log("Saving directory for window:", directoryToSave);
      store.set(StoreKeys.DirectoryFromPreviousSession, directoryToSave);
    }
  });

  if (activeWindows.length <= 0) {
    update(win);
    registerLLMSessionHandlers(store);
    registerDBSessionHandlers(store);
    registerStoreHandlers(store);
    registerFileHandlers();
  }
}

app.whenReady().then(async () => {
  createWindow();
});

app.on("window-all-closed", () => {
  // win = null;
  if (process.platform !== "darwin") app.quit();
});

// app.on("second-instance", () => {
//   if (windows) {
//     // Focus on the main window if the user tried to open another
//     if (win.isMinimized()) win.restore();
//     win.focus();
//   }
// });

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

ipcMain.handle("open-directory-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (!result.canceled) {
    return result.filePaths;
  } else {
    return null;
  }
});

ipcMain.handle("open-file-dialog", async (event, extensions) => {
  const filters =
    extensions && extensions.length > 0 ? [{ name: "Files", extensions }] : [];

  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections", "showHiddenFiles"], // Add 'showHiddenFiles' here
    filters: filters,
  });

  if (!result.canceled) {
    return result.filePaths;
  } else {
    return [];
  }
});

ipcMain.on("index-files-in-directory", async (event) => {
  try {
    console.log("Indexing files in directory");
    const windowInfo = getWindowInfoForContents(activeWindows, event.sender);
    if (!windowInfo) {
      throw new Error("No window info found");
    }
    const defaultEmbeddingModelConfig = getDefaultEmbeddingModelConfig(store);
    const dbPath = path.join(app.getPath("userData"), "vectordb");
    dbConnection = await lancedb.connect(dbPath);

    await windowInfo.dbTableClient.initialize(
      dbConnection,
      windowInfo.vaultDirectoryForWindow,
      defaultEmbeddingModelConfig
    );
    await RepopulateTableWithMissingItems(
      windowInfo.dbTableClient,
      windowInfo.vaultDirectoryForWindow,
      (progress) => {
        event.sender.send("indexing-progress", progress);
      }
    );
    const win = BrowserWindow.fromWebContents(event.sender);

    if (win) {
      startWatchingDirectory(win, windowInfo.vaultDirectoryForWindow);
      updateFileListForRenderer(win, windowInfo.vaultDirectoryForWindow);
    }
    event.sender.send("indexing-progress", 1);
  } catch (error) {
    let errorStr = "";

    if (errorToString(error).includes("Embedding function error")) {
      errorStr = `${error}. Please try downloading an embedding model from Hugging Face and attaching it in settings. More information can be found in settings.`;
    } else {
      errorStr = `${error}. Please try restarting or open a Github issue.`;
    }
    event.sender.send("indexing-error", errorStr);
    console.error("Error during file indexing:", error);
  }
});

ipcMain.on("show-context-menu-file-item", (event, file) => {
  const menu = new Menu();
  menu.append(
    new MenuItem({
      label: "Delete",
      click: () => {
        console.log(file.path);
        fs.stat(file.path, (err, stats) => {
          if (err) {
            console.error("An error occurred:", err);
            return;
          }

          if (stats.isDirectory()) {
            // For directories (Node.js v14.14.0 and later)
            fs.rm(file.path, { recursive: true }, (err) => {
              if (err) {
                console.error("An error occurred:", err);
                return;
              }
              console.log(
                `Directory at ${file.path} was deleted successfully.`
              );
            });
          } else {
            fs.unlink(file.path, (err) => {
              if (err) {
                console.error("An error occurred:", err);
                return;
              }
              console.log(`File at ${file.path} was deleted successfully.`);
              // TODO: Update table.
            });
          }
        });
      },
    })
  );

  console.log("menu key: ", file);

  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (browserWindow) {
    menu.popup({ window: browserWindow });
  }
});

ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle("get-platform", async () => {
  return process.platform;
});

ipcMain.on("open-new-window", () => {
  createWindow();
});

ipcMain.handle("path-basename", (event, pathString: string) => {
  return path.basename(pathString);
});
