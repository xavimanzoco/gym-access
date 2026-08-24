const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const fs = require("fs");

const PORT = 3847;
const isDev = !app.isPackaged;

let mainWindow = null;
let serverProcess = null;

function getDbPath() {
  if (isDev) return undefined;
  return path.join(app.getPath("userData"), "data", "gym.db");
}

function startServer() {
  if (isDev) {
    serverProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PORT: String(PORT), HOSTNAME: "localhost" },
      shell: true,
      stdio: "pipe",
    });
  } else {
    const standaloneDir = path.join(process.resourcesPath, "standalone");

    for (const [from, to] of [["_modules", "node_modules"], ["_next", ".next"]]) {
      const src = path.join(standaloneDir, from);
      const dst = path.join(standaloneDir, to);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.renameSync(src, dst);
      }
    }

    const serverEnv = Object.assign({}, process.env, {
      PORT: String(PORT),
      HOSTNAME: "0.0.0.0",
      ELECTRON_RUN_AS_NODE: "1",
    });
    const dbPath = getDbPath();
    if (dbPath) serverEnv.GYM_DB_PATH = dbPath;

    serverProcess = spawn(
      process.execPath,
      ["--experimental-sqlite", path.join(standaloneDir, "server.js")],
      { cwd: standaloneDir, env: serverEnv, stdio: "pipe" },
    );
  }

  serverProcess.stdout?.on("data", (d) => console.log(`[next] ${d}`));
  serverProcess.stderr?.on("data", (d) => console.error(`[next] ${d}`));
  serverProcess.on("exit", (code) => console.log(`[next] exited (${code})`));
}

function waitForServer() {
  return new Promise((resolve) => {
    const check = () => {
      const socket = new net.Socket();
      socket
        .once("connect", () => { socket.destroy(); resolve(); })
        .once("error", () => { socket.destroy(); setTimeout(check, 300); })
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
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("no-sandbox");

app.whenReady().then(async () => {
  startServer();
  await waitForServer();
  await new Promise((r) => setTimeout(r, 2000));
  createWindow();
});

app.on("window-all-closed", () => app.quit());

app.on("before-quit", () => {
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
});

app.on("activate", () => {
  if (!mainWindow) createWindow();
});
