const { app, BrowserWindow, Tray, Menu, nativeImage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const PORT = 3847;
const isDev = !app.isPackaged;

let mainWindow = null;
let tray = null;
let serverProcess = null;

function getIconPath() {
  if (isDev) return path.join(__dirname, "..", "public", "icon.png");
  return path.join(process.resourcesPath, "standalone", "public", "icon.png");
}

function getDbPath() {
  if (isDev) return undefined;
  return path.join(app.getPath("userData"), "data", "gym.db");
}

function getServerEnv() {
  const env = { ...process.env, PORT: String(PORT), HOSTNAME: "localhost" };
  const dbPath = getDbPath();
  if (dbPath) env.GYM_DB_PATH = dbPath;
  return env;
}

function startServer() {
  if (isDev) {
    serverProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
      cwd: path.join(__dirname, ".."),
      env: getServerEnv(),
      shell: true,
      stdio: "pipe",
    });
  } else {
    const standaloneDir = path.join(process.resourcesPath, "standalone");
    const serverPath = path.join(standaloneDir, "server.js");
    const env = getServerEnv();
    env.ELECTRON_RUN_AS_NODE = "1";
    serverProcess = spawn(
      process.execPath,
      ["--experimental-sqlite", serverPath],
      { cwd: standaloneDir, env, stdio: "pipe" },
    );
  }

  serverProcess.stdout?.on("data", (d) => console.log(`[next] ${d}`));
  serverProcess.stderr?.on("data", (d) => console.error(`[next] ${d}`));
  serverProcess.on("exit", (code) => {
    console.log(`[next] Server exited (${code})`);
    serverProcess = null;
  });
}

function waitForServer() {
  return new Promise((resolve) => {
    const check = () => {
      const socket = new net.Socket();
      socket
        .once("connect", () => {
          socket.destroy();
          resolve();
        })
        .once("error", () => {
          socket.destroy();
          setTimeout(check, 300);
        })
        .connect(PORT, "127.0.0.1");
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Gym Access",
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on("close", (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("Gym Access");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        tray.destroy();
        tray = null;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  startServer();
  await waitForServer();
  createWindow();
  createTray();
});

app.on("window-all-closed", () => {
  // Tray keeps it alive
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});
