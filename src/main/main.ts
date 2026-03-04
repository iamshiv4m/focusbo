/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  screen,
  Notification,
  Tray,
  Menu,
  globalShortcut,
  powerMonitor,
  nativeImage,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import {
  getAppState,
  setTheme,
  setWindowState,
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  getSessions,
  addSession,
  updateSession,
  setCurrentTaskName,
  setCurrentFocusGoalId,
  setUserPrefs,
  getUserPrefs,
  addAppUsageEntries,
  getAppUsage,
  getLiveTimer,
  setLiveTimer,
  resetLiveTimer,
  setOnboardingComplete,
} from './store';
import { startTracking, stopTracking } from './appTracker';
import {
  DEFAULT_LIVE_TIMER,
  type Goal,
  type Task,
  type Session,
  type TimerStateUpdate,
  type LiveTimerState,
} from '../types';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let dockWindow: BrowserWindow | null = null;
let appWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentTimerState: TimerStateUpdate = {
  status: 'idle',
  remaining: 0,
  mode: 'focus',
  taskName: '',
};

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// Focusbo store IPC
ipcMain.handle('store:get-state', () => getAppState());
ipcMain.handle('store:set-theme', (_, theme: 'dark' | 'light') => {
  setTheme(theme);
  return getAppState();
});
ipcMain.handle('store:set-current-task-name', (_, name: string) => {
  setCurrentTaskName(name);
  return getAppState();
});
ipcMain.handle('store:set-current-focus-goal-id', (_, id: string) => {
  setCurrentFocusGoalId(id);
  return getAppState();
});
ipcMain.handle('store:get-goals', () => getGoals());
ipcMain.handle('store:add-goal', (_, goal: Goal) => {
  addGoal(goal);
  return getGoals();
});
ipcMain.handle('store:update-goal', (_, id: string, updates: Partial<Goal>) => {
  updateGoal(id, updates);
  return getGoals();
});
ipcMain.handle('store:delete-goal', (_, id: string) => {
  deleteGoal(id);
  return getGoals();
});
ipcMain.handle('store:get-tasks', () => getTasks());
ipcMain.handle('store:add-task', (_, task: Task) => {
  addTask(task);
  return getTasks();
});
ipcMain.handle('store:update-task', (_, id: string, updates: Partial<Task>) => {
  updateTask(id, updates);
  return getTasks();
});
ipcMain.handle('store:delete-task', (_, id: string) => {
  deleteTask(id);
  return getTasks();
});
ipcMain.handle('store:get-sessions', () => getSessions());
ipcMain.handle('store:add-session', (_, session: Session) => {
  addSession(session);
  return getSessions();
});
ipcMain.handle(
  'store:update-session',
  (_, id: string, updates: Partial<Session>) => {
    updateSession(id, updates);
    return getSessions();
  },
);
ipcMain.handle(
  'store:set-user-prefs',
  (
    _,
    prefs: {
      focusDuration?: number;
      breakDuration?: number;
      soundOnComplete?: boolean;
      notifyOnComplete?: boolean;
    },
  ) => {
    setUserPrefs(prefs);
    return getAppState();
  },
);

ipcMain.handle(
  'app:notify',
  (_, { title, body }: { title: string; body?: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body: body ?? '' }).show();
    }
  },
);

ipcMain.handle('onboarding:complete', () => {
  setOnboardingComplete();
  return getAppState();
});

// Timer state sync: renderer → main (for tray + global shortcuts)
ipcMain.handle('timer:state-update', (_, update: TimerStateUpdate) => {
  currentTimerState = update;
  updateTray();
});

function broadcastToAll(channel: string, data: unknown) {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send(channel, data);
  }
  if (appWindow && !appWindow.isDestroyed()) {
    appWindow.webContents.send(channel, data);
  }
}

ipcMain.handle('live-timer:get', () => getLiveTimer());

ipcMain.handle(
  'live-timer:start',
  (_, payload: { taskName: string; goalId?: string; goalName?: string }) => {
    const newState: LiveTimerState = {
      isActive: true,
      status: 'running',
      taskName: payload.taskName,
      goalId: payload.goalId,
      goalName: payload.goalName,
      elapsed: 0,
      breakElapsed: 0,
      startedAt: Date.now(),
      breaks: 0,
      mode: 'focus',
    };
    setLiveTimer(newState);
    broadcastToAll('live-timer:update', newState);
    return newState;
  },
);

ipcMain.handle('live-timer:pause', () => {
  const current = getLiveTimer();
  if (!current.isActive) return current;
  const updated: LiveTimerState = { ...current, status: 'paused' };
  setLiveTimer(updated);
  broadcastToAll('live-timer:update', updated);
  return updated;
});

ipcMain.handle('live-timer:resume', () => {
  const current = getLiveTimer();
  if (!current.isActive) return current;
  const updated: LiveTimerState = {
    ...current,
    status: 'running',
    mode: 'focus',
  };
  setLiveTimer(updated);
  broadcastToAll('live-timer:update', updated);
  return updated;
});

ipcMain.handle('live-timer:break', () => {
  const current = getLiveTimer();
  if (!current.isActive) return current;
  const updated: LiveTimerState = {
    ...current,
    status: 'break',
    mode: 'break',
    breaks: current.breaks + 1,
    breakElapsed: 0,
  };
  setLiveTimer(updated);
  broadcastToAll('live-timer:update', updated);
  return updated;
});

ipcMain.handle('live-timer:end-break', () => {
  const current = getLiveTimer();
  if (!current.isActive) return current;
  const updated: LiveTimerState = {
    ...current,
    status: 'running',
    mode: 'focus',
  };
  setLiveTimer(updated);
  broadcastToAll('live-timer:update', updated);
  return updated;
});

ipcMain.handle(
  'live-timer:tick',
  (_, elapsed: number, breakElapsed: number) => {
    const current = getLiveTimer();
    if (!current.isActive) return current;
    const updated: LiveTimerState = { ...current, elapsed, breakElapsed };
    setLiveTimer(updated);
    if (appWindow && !appWindow.isDestroyed()) {
      appWindow.webContents.send('live-timer:update', updated);
    }
    return updated;
  },
);

ipcMain.handle('live-timer:stop', () => {
  const current = getLiveTimer();
  resetLiveTimer();
  const resetState = { ...DEFAULT_LIVE_TIMER };
  broadcastToAll('live-timer:update', resetState);
  return current;
});

ipcMain.handle('live-timer:edit-task', (_, taskName: string) => {
  const current = getLiveTimer();
  if (!current.isActive) return current;
  const updated: LiveTimerState = { ...current, taskName };
  setLiveTimer(updated);
  broadcastToAll('live-timer:update', updated);
  return updated;
});

// Auto-launch
ipcMain.handle('app:set-auto-launch', (_, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  setUserPrefs({ autoLaunch: enabled });
  return enabled;
});

ipcMain.handle('app:get-auto-launch', () => {
  return app.getLoginItemSettings().openAtLogin;
});

// ─── App Usage Tracking ────────────────────────────────────
ipcMain.handle('app-tracking:start', (_, sessionId?: string) => {
  const prefs = getUserPrefs();
  if (!prefs.trackAppUsage) return;
  startTracking(sessionId);
});

ipcMain.handle('app-tracking:stop', () => {
  const entries = stopTracking();
  if (entries.length) {
    addAppUsageEntries(entries);
  }
  return entries;
});

ipcMain.handle('app-tracking:get-data', () => {
  return getAppUsage();
});

// Window: 2-window architecture - dock (small) + app (full)
const DOCK_WIDTH_COLLAPSED = 56;
const DOCK_WIDTH_OPTIONS = 240;
const DOCK_HEIGHT_COLLAPSED = 56;
const DOCK_HEIGHT_OPTIONS = 520;
const DOCK_WIDTH_TIMER_ACTIVE = 240;
const DOCK_HEIGHT_TIMER_ACTIVE = 72;
const APP_WIDTH = 440;
const APP_HEIGHT = 780;
const EDGE_MARGIN = 16;

function getDockBounds(state: 'collapsed' | 'options' | 'timer-active') {
  const workArea = screen.getPrimaryDisplay().workArea;
  let w: number;
  let h: number;
  if (state === 'timer-active') {
    w = DOCK_WIDTH_TIMER_ACTIVE;
    h = DOCK_HEIGHT_TIMER_ACTIVE;
  } else if (state === 'options') {
    w = DOCK_WIDTH_OPTIONS;
    h = DOCK_HEIGHT_OPTIONS;
  } else {
    w = DOCK_WIDTH_COLLAPSED;
    h = DOCK_HEIGHT_COLLAPSED;
  }
  h = Math.min(h, workArea.height - 32);
  const x = workArea.x + workArea.width - w - EDGE_MARGIN;
  const y = workArea.y + (workArea.height - h) / 2;
  return { x, y, width: w, height: h };
}

function getAppBounds() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const w = APP_WIDTH;
  const h = Math.min(APP_HEIGHT, workArea.height - 32);
  const x = workArea.x + workArea.width - w - EDGE_MARGIN;
  const y = workArea.y + (workArea.height - h) / 2;
  return { x, y, width: w, height: h };
}

ipcMain.handle('window:set-state', (_, state: 'collapsed' | 'options') => {
  if (!dockWindow) return state;
  setWindowState(state);
  dockWindow.setBounds(getDockBounds(state));
  return state;
});

ipcMain.handle(
  'window:resize-dock',
  (_, state: 'collapsed' | 'options' | 'timer-active') => {
    if (!dockWindow) return;
    const bounds = getDockBounds(state);
    dockWindow.setBounds(bounds, true);
    return bounds;
  },
);

const getAssetPath = (...paths: string[]): string => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');
  return path.join(RESOURCES_PATH, ...paths);
};

ipcMain.handle('window:open-secondary', async (_, route: string) => {
  const bounds = getAppBounds();
  if (appWindow) {
    appWindow.show();
    appWindow.focus();
    appWindow.webContents.send('navigate-to', route);
    const liveTimer = getLiveTimer();
    if (!liveTimer.isActive) dockWindow?.hide();
    return;
  }
  appWindow = new BrowserWindow({
    show: false,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minHeight: 720,
    icon: getAssetPath('icon.png'),
    frame: false,
    resizable: true,
    transparent: process.platform === 'darwin',
    backgroundColor: process.platform === 'darwin' ? '#00000000' : '#0c0c0e',
    hasShadow: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  appWindow.loadURL(resolveHtmlPath('index.html', 'app'));
  appWindow.on('ready-to-show', () => {
    if (appWindow) {
      appWindow.show();
      appWindow.webContents.send('navigate-to', route);
      const liveTimer = getLiveTimer();
      if (!liveTimer.isActive) dockWindow?.hide();
    }
  });
  appWindow.on('closed', () => {
    appWindow = null;
    dockWindow?.show();
  });
  appWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
});

ipcMain.handle('window:close-secondary', () => {
  if (appWindow) {
    appWindow.close();
    appWindow = null;
  }
});

ipcMain.handle('window:get-state', () => getAppState().windowState);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug = false;
/*  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'; */

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createDockWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const initialState = getAppState();
  const startState = initialState.windowState;
  const bounds = getDockBounds(startState);
  setWindowState(startState);

  dockWindow = new BrowserWindow({
    show: false,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    icon: getAssetPath('icon.png'),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: process.platform === 'darwin',
    backgroundColor: process.platform === 'darwin' ? '#00000000' : '#0c0c0e',
    hasShadow: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  dockWindow.loadURL(resolveHtmlPath('index.html', 'dock'));

  dockWindow.on('ready-to-show', () => {
    if (!dockWindow) {
      throw new Error('"dockWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      dockWindow.minimize();
    } else {
      dockWindow.show();
    }
  });

  dockWindow.on('closed', () => {
    dockWindow = null;
    if (appWindow) appWindow.close();
  });

  const menuBuilder = new MenuBuilder(dockWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  dockWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createDockWindow();
    setupTray();
    setupGlobalShortcuts();
    setupPowerMonitoring();
    setupAutoLaunch();
    app.on('activate', () => {
      if (dockWindow === null) createDockWindow();
      else dockWindow.show();
    });
  })
  .catch(console.log);

/* ────────────────────────────────────────────────────────────
   TRAY — menu bar icon with timer countdown
   ──────────────────────────────────────────────────────────── */

function formatTimeShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setupTray() {
  // Create a 16x16 template icon for macOS menu bar
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAF5JREFUOI1jYBhsgJGBgYGBgQGC/zMwMCgwMDD8hwkwIvEZGBj+MzAwKCDxGRj+Q/mMaHxGBgYFRgYGBQYGBn2oGWgAqgcEkPSA2IxwixjR+IwMDAqMDAwKDAMIAAAKuQP/xjxGZgAAAABJRU5ErkJggg==',
  );
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Focusbo');
  updateTray();

  tray.on('click', () => {
    if (appWindow) {
      appWindow.show();
      appWindow.focus();
    } else if (dockWindow) {
      dockWindow.show();
    }
  });
}

function updateTray() {
  if (!tray) return;

  const prefs = getUserPrefs();
  const { status, remaining, mode, taskName } = currentTimerState;

  // Update tray title (text next to icon on macOS)
  if (prefs.showTrayTimer && status !== 'idle') {
    const prefix =
      status === 'paused' ? '⏸ ' : mode === 'focus' ? '🎯 ' : '☕ ';
    tray.setTitle(`${prefix}${formatTimeShort(remaining)}`);
  } else {
    tray.setTitle('');
  }

  // Build context menu
  const menuItems: Electron.MenuItemConstructorOptions[] = [];

  if (status === 'idle') {
    menuItems.push(
      {
        label: 'Start Focus',
        click: () => sendTimerCommand('start-focus'),
      },
      {
        label: 'Start Break',
        click: () => sendTimerCommand('start-break'),
      },
    );
  } else if (status === 'running') {
    const label =
      mode === 'focus'
        ? `Focusing${taskName ? ` — ${taskName}` : ''}`
        : 'On break';
    menuItems.push(
      { label, enabled: false },
      { label: `${formatTimeShort(remaining)} remaining`, enabled: false },
      { type: 'separator' },
      { label: 'Pause', click: () => sendTimerCommand('pause') },
      { label: 'Stop', click: () => sendTimerCommand('stop') },
    );
  } else if (status === 'paused') {
    menuItems.push(
      { label: 'Timer paused', enabled: false },
      { label: `${formatTimeShort(remaining)} remaining`, enabled: false },
      { type: 'separator' },
      { label: 'Resume', click: () => sendTimerCommand('resume') },
      { label: 'Stop', click: () => sendTimerCommand('stop') },
    );
  }

  menuItems.push(
    { type: 'separator' },
    {
      label: 'Open Focusbo',
      click: () => {
        if (appWindow) {
          appWindow.show();
          appWindow.focus();
        } else {
          ipcMain.emit('window:open-secondary', null, '/');
        }
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function sendTimerCommand(action: string) {
  if (appWindow) {
    appWindow.webContents.send('timer:command', action);
    appWindow.show();
  }
}

/* ────────────────────────────────────────────────────────────
   GLOBAL SHORTCUTS — system-wide keyboard shortcuts
   ──────────────────────────────────────────────────────────── */

function setupGlobalShortcuts() {
  const prefs = getUserPrefs();
  if (!prefs.globalShortcutsEnabled) return;

  registerShortcuts();
}

function registerShortcuts() {
  // Unregister first to avoid duplicates
  globalShortcut.unregisterAll();

  const prefs = getUserPrefs();
  if (!prefs.globalShortcutsEnabled) return;

  // Cmd/Ctrl+Shift+F — Toggle focus
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    const { status } = currentTimerState;
    if (status === 'idle') {
      sendTimerCommand('start-focus');
    } else if (status === 'running') {
      sendTimerCommand('pause');
    } else if (status === 'paused') {
      sendTimerCommand('resume');
    }
  });

  // Cmd/Ctrl+Shift+B — Start break
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    sendTimerCommand('start-break');
  });

  // Cmd/Ctrl+Shift+X — Stop timer
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    sendTimerCommand('stop');
  });
}

// Re-register when prefs change
ipcMain.handle('app:update-shortcuts', () => {
  registerShortcuts();
});

/* ────────────────────────────────────────────────────────────
   POWER & IDLE — pause timer when user is away
   ──────────────────────────────────────────────────────────── */

function setupPowerMonitoring() {
  powerMonitor.on('suspend', () => {
    // System going to sleep — pause timer
    if (currentTimerState.status === 'running') {
      sendTimerCommand('pause');
    }
  });

  powerMonitor.on('lock-screen', () => {
    // Screen locked — pause timer
    if (currentTimerState.status === 'running') {
      sendTimerCommand('pause');
    }
  });

  powerMonitor.on('resume', () => {
    // System woke up — notify renderer
    if (appWindow) {
      appWindow.webContents.send('system:power-event', 'resume');
    }
  });

  // Check idle state every 30s
  setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    // If idle for 5+ minutes and timer is running → auto-pause
    if (idleTime >= 300 && currentTimerState.status === 'running') {
      sendTimerCommand('pause');
      if (appWindow) {
        appWindow.webContents.send('system:idle-state', 'idle');
      }
    }
  }, 30000);
}

/* ────────────────────────────────────────────────────────────
   AUTO-LAUNCH — start on login
   ──────────────────────────────────────────────────────────── */

function setupAutoLaunch() {
  const prefs = getUserPrefs();
  app.setLoginItemSettings({ openAtLogin: prefs.autoLaunch });
}

// Cleanup shortcuts on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
