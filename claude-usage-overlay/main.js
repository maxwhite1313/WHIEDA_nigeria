const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win;
let tray;
let isMinimized = false;

// Pricing per 1M tokens (Claude Sonnet 4.x as of 2025)
const PRICING = {
  input: 3.0,
  output: 15.0,
  cacheCreate: 3.75,
  cacheRead: 0.30,
};

function parseUsageFromJsonl(filePath) {
  const usage = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  const todayUsage = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  const today = new Date().toISOString().slice(0, 10);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const msg = entry.message;
        if (!msg || !msg.usage) continue;

        const u = msg.usage;
        const input = (u.input_tokens || 0);
        const output = (u.output_tokens || 0);
        const cacheCreate = (u.cache_creation_input_tokens || 0);
        const cacheRead = (u.cache_read_input_tokens || 0);

        usage.input += input;
        usage.output += output;
        usage.cacheCreate += cacheCreate;
        usage.cacheRead += cacheRead;

        const ts = entry.timestamp || '';
        if (ts.startsWith(today)) {
          todayUsage.input += input;
          todayUsage.output += output;
          todayUsage.cacheCreate += cacheCreate;
          todayUsage.cacheRead += cacheRead;
        }
      } catch {}
    }
  } catch {}

  return { all: usage, today: todayUsage };
}

function calcCost(u) {
  return (
    (u.input / 1e6) * PRICING.input +
    (u.output / 1e6) * PRICING.output +
    (u.cacheCreate / 1e6) * PRICING.cacheCreate +
    (u.cacheRead / 1e6) * PRICING.cacheRead
  );
}

function getClaudeDir() {
  // Claude Code stores sessions in ~/.claude/projects on all platforms
  return path.join(os.homedir(), '.claude', 'projects');
}

function readAllUsage() {
  const claudeDir = getClaudeDir();
  const totals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  const todayTotals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  const sessions = [];

  try {
    const projects = fs.readdirSync(claudeDir);
    for (const project of projects) {
      const projectDir = path.join(claudeDir, project);
      if (!fs.statSync(projectDir).isDirectory()) continue;

      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const { all, today } = parseUsageFromJsonl(filePath);

        totals.input += all.input;
        totals.output += all.output;
        totals.cacheCreate += all.cacheCreate;
        totals.cacheRead += all.cacheRead;

        todayTotals.input += today.input;
        todayTotals.output += today.output;
        todayTotals.cacheCreate += today.cacheCreate;
        todayTotals.cacheRead += today.cacheRead;

        const hasToday = today.input + today.output + today.cacheCreate + today.cacheRead > 0;
        if (hasToday) {
          sessions.push({
            project: project.replace(/^-/, '').replace(/-/g, '/'),
            file: file.slice(0, 8),
            tokens: today.input + today.output,
          });
        }
      }
    }
  } catch {}

  return {
    today: { ...todayTotals, cost: calcCost(todayTotals) },
    allTime: { ...totals, cost: calcCost(totals) },
    claudeDir,
    sessions,
    updatedAt: new Date().toISOString(),
  };
}

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 340,
    height: 340,
    x: width - 360,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  win.loadFile('index.html');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('get-usage', () => readAllUsage());

ipcMain.on('close-window', () => app.quit());

ipcMain.on('minimize-window', () => {
  if (!win) return;
  if (isMinimized) {
    win.setSize(340, 340);
    isMinimized = false;
  } else {
    win.setSize(340, 48);
    isMinimized = true;
  }
});

ipcMain.on('drag-move', (_, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + dx, y + dy);
});
