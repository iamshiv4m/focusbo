/**
 * Cross-platform active-app tracker.
 *
 * Polls the OS every ~3 seconds to detect which application is in the
 * foreground. Consecutive samples of the same app are merged into a
 * single AppUsageEntry. Only runs while a focus session is active and
 * the user has tracking enabled.
 *
 * macOS  — osascript (AppleScript via System Events)
 * Windows — PowerShell Get-Process on the foreground window
 */

import { execFile } from 'child_process';
import type { AppUsageEntry } from '../types';

const POLL_INTERVAL = 3_000; // 3 seconds

let timer: ReturnType<typeof setInterval> | null = null;
let entries: AppUsageEntry[] = [];
let currentApp: string | null = null;
let currentStart = 0;
let activeSessionId: string | undefined;
let entryCounter = 0;

function generateId(): string {
  entryCounter += 1;
  return `au-${Date.now()}-${entryCounter}`;
}

/* ────────────────────────────────────────────
   Platform-specific frontmost-app detection
   ──────────────────────────────────────────── */

function getActiveAppMac(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'osascript',
      [
        '-e',
        'tell application "System Events" to get name of first application process whose frontmost is true',
      ],
      { timeout: 2_000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const name = stdout.trim();
        resolve(name || null);
      },
    );
  });
}

function getActiveAppWindows(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        '(Get-Process | Where-Object {$_.MainWindowHandle -eq (Add-Type -MemberDefinition \'[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();\' -Name Win32 -Namespace Temp -PassThru)::GetForegroundWindow()}).ProcessName',
      ],
      { timeout: 3_000 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const name = stdout.trim();
        resolve(name || null);
      },
    );
  });
}

function getActiveApp(): Promise<string | null> {
  if (process.platform === 'darwin') return getActiveAppMac();
  if (process.platform === 'win32') return getActiveAppWindows();
  // Linux fallback — could use xdotool, but skip for now
  return Promise.resolve(null);
}

/* ────────────────────────────────────────────
   Tracking lifecycle
   ──────────────────────────────────────────── */

function flushCurrent() {
  if (currentApp && currentStart > 0) {
    const now = Date.now();
    const duration = Math.round((now - currentStart) / 1000);
    if (duration >= 1) {
      entries.push({
        id: generateId(),
        appName: currentApp,
        startTime: currentStart,
        endTime: now,
        duration,
        sessionId: activeSessionId,
      });
    }
  }
  currentApp = null;
  currentStart = 0;
}

async function poll() {
  const appName = await getActiveApp();
  if (!appName) return;

  // Filter out Focusbo itself — we don't need to track that
  if (appName === 'Electron' || appName.toLowerCase() === 'focusbo') return;

  if (appName === currentApp) return; // still on the same app

  // App changed — flush the previous entry
  flushCurrent();
  currentApp = appName;
  currentStart = Date.now();
}

/**
 * Start tracking active apps.
 * Returns immediately. Call `stopTracking()` to stop + get results.
 */
export function startTracking(sessionId?: string): void {
  stopTracking(); // ensure clean slate
  entries = [];
  currentApp = null;
  currentStart = 0;
  activeSessionId = sessionId;
  entryCounter = 0;

  // Immediately poll once
  poll();
  timer = setInterval(poll, POLL_INTERVAL);
}

/**
 * Stop tracking and return all collected entries.
 * Flushes the in-progress entry before returning.
 */
export function stopTracking(): AppUsageEntry[] {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  flushCurrent();
  const result = [...entries];
  entries = [];
  activeSessionId = undefined;
  return result;
}

/** Whether the tracker is currently running. */
export function isTracking(): boolean {
  return timer !== null;
}
